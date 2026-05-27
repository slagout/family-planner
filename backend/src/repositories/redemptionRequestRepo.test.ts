/**
 * Unit tests for redemptionRequestRepo atomic transactions.
 * The DB module is mocked — no real Postgres connection needed.
 */
import { redemptionRequestRepo } from './redemptionRequestRepo';
import * as db from '../db';

jest.mock('../db');

const mockWithTransaction = db.withTransaction as jest.MockedFunction<typeof db.withTransaction>;

function buildClient(results: { rows: any[] }[]) {
  let callIndex = 0;
  return {
    query: jest.fn(async () => results[callIndex++] ?? { rows: [] }),
  } as any;
}

const basePendingRow = {
  id: 'req1', child_id: 'kid1', reward_id: 'rew1',
  points_spent: 50, status: 'pending', requested_at: new Date(),
  approved_by: null, approved_at: null, fulfilled_at: null,
  cancelled_at: null, cancel_reason: null,
};

describe('redemptionRequestRepo.requestRedemption', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('creates a pending redemption when child has enough points', async () => {
    const client = buildClient([
      { rows: [{ id: 'rew1', point_cost: 50, max_redemptions: null, is_active: true }] },
      { rows: [{ balance: '100' }] },
      { rows: [basePendingRow] },
      { rows: [] },  // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await redemptionRequestRepo.requestRedemption({
      childId: 'kid1', rewardId: 'rew1', requestedByUserId: 'kid1-user',
    });

    expect(result.status).toBe('pending');
    expect(result.pointsSpent).toBe(50);
    expect(result.childId).toBe('kid1');
  });

  it('throws when child has insufficient points', async () => {
    const client = buildClient([
      { rows: [{ id: 'rew1', point_cost: 100, max_redemptions: null, is_active: true }] },
      { rows: [{ balance: '40' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.requestRedemption({ childId: 'kid1', rewardId: 'rew1', requestedByUserId: 'kid1' })
    ).rejects.toThrow('Insufficient points');
  });

  it('throws when reward is inactive', async () => {
    const client = buildClient([
      { rows: [{ id: 'rew1', point_cost: 10, max_redemptions: null, is_active: false }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.requestRedemption({ childId: 'kid1', rewardId: 'rew1', requestedByUserId: 'kid1' })
    ).rejects.toThrow('no longer active');
  });

  it('throws when reward has reached max redemptions', async () => {
    const client = buildClient([
      { rows: [{ id: 'rew1', point_cost: 10, max_redemptions: 2, is_active: true }] },
      { rows: [{ cnt: '2' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.requestRedemption({ childId: 'kid1', rewardId: 'rew1', requestedByUserId: 'kid1' })
    ).rejects.toThrow('maximum redemption');
  });
});

describe('redemptionRequestRepo.approveRedemption — atomic point deduction', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deducts points atomically and updates status to approved', async () => {
    const approvedRow = { ...basePendingRow, status: 'approved', approved_by: 'parent1', approved_at: new Date() };
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', reward_id: 'rew1', points_spent: 50, status: 'pending' }] },
      { rows: [{ balance: '80' }] },
      { rows: [] },            // INSERT point_ledger (deduction)
      { rows: [approvedRow] }, // UPDATE redemption_requests
      { rows: [] },            // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await redemptionRequestRepo.approveRedemption('req1', 'parent1');

    // Verify the ledger INSERT used a negative delta
    const insertLedgerCall = (client.query as jest.Mock).mock.calls.find(
      (args: any[]) => typeof args[0] === 'string' && args[0].includes('point_ledger') && args[0].includes('INSERT')
    );
    expect(insertLedgerCall).toBeDefined();
    expect(insertLedgerCall![1][1]).toBe(-50);    // delta = -50

    expect(result.status).toBe('approved');
    expect(result.approvedBy).toBe('parent1');
  });

  it('throws when trying to approve a non-pending request', async () => {
    const client = buildClient([
      { rows: [{ id: 'req2', child_id: 'kid1', reward_id: 'rew1', points_spent: 50, status: 'approved' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.approveRedemption('req2', 'parent1')
    ).rejects.toThrow('Cannot approve');
  });

  it('throws when child no longer has enough points at approval time', async () => {
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', reward_id: 'rew1', points_spent: 50, status: 'pending' }] },
      { rows: [{ balance: '30' }] },   // only 30 left, need 50
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.approveRedemption('req1', 'parent1')
    ).rejects.toThrow('Insufficient points');
  });
});

describe('redemptionRequestRepo.cancelRedemption', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('cancels a pending request without issuing a refund', async () => {
    const cancelledRow = { ...basePendingRow, status: 'cancelled', cancelled_at: new Date(), cancel_reason: 'changed mind' };
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', points_spent: 50, status: 'pending' }] },
      { rows: [cancelledRow] },
      { rows: [] },  // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await redemptionRequestRepo.cancelRedemption({
      id: 'req1', cancelledByUserId: 'parent1', reason: 'changed mind',
    });

    const ledgerCall = (client.query as jest.Mock).mock.calls.find(
      (args: any[]) => typeof args[0] === 'string' && args[0].includes('point_ledger') && args[0].includes('INSERT')
    );
    expect(ledgerCall).toBeUndefined();    // no ledger entry for pending cancel
    expect(result.status).toBe('cancelled');
  });

  it('issues a positive refund when cancelling an approved request', async () => {
    const cancelledRow = { ...basePendingRow, status: 'cancelled', cancelled_at: new Date() };
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', points_spent: 50, status: 'approved' }] },
      { rows: [{ balance: '10' }] },   // current balance after deduction
      { rows: [] },                    // INSERT point_ledger (refund)
      { rows: [cancelledRow] },        // UPDATE redemption_requests
      { rows: [] },                    // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await redemptionRequestRepo.cancelRedemption({ id: 'req1', cancelledByUserId: 'parent1' });

    const refundCall = (client.query as jest.Mock).mock.calls.find(
      (args: any[]) => typeof args[0] === 'string' && args[0].includes('point_ledger') && args[0].includes('INSERT')
    );
    expect(refundCall).toBeDefined();
    expect(refundCall![1][1]).toBe(50);    // positive delta = refund
  });

  it('throws when trying to cancel a fulfilled request', async () => {
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', points_spent: 50, status: 'fulfilled' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.cancelRedemption({ id: 'req1', cancelledByUserId: 'parent1' })
    ).rejects.toThrow('Cannot cancel a fulfilled');
  });

  it('throws when request is already cancelled', async () => {
    const client = buildClient([
      { rows: [{ id: 'req1', child_id: 'kid1', points_spent: 50, status: 'cancelled' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.cancelRedemption({ id: 'req1', cancelledByUserId: 'parent1' })
    ).rejects.toThrow('already cancelled');
  });
});

describe('redemptionRequestRepo.fulfillRedemption', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('fulfills an approved request successfully', async () => {
    const fulfilledRow = { ...basePendingRow, status: 'fulfilled', fulfilled_at: new Date() };
    const client = buildClient([
      { rows: [{ id: 'req1', status: 'approved' }] },
      { rows: [fulfilledRow] },
      { rows: [] },  // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await redemptionRequestRepo.fulfillRedemption('req1', 'parent1');
    expect(result.status).toBe('fulfilled');
    expect(result.fulfilledAt).toBeDefined();
  });

  it('throws when trying to fulfill a non-approved request', async () => {
    const client = buildClient([
      { rows: [{ id: 'req1', status: 'pending' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      redemptionRequestRepo.fulfillRedemption('req1', 'parent1')
    ).rejects.toThrow('must be approved first');
  });
});
