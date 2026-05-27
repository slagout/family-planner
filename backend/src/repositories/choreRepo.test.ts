/**
 * Unit tests for choreRepo split logic.
 * The DB module is mocked — no real Postgres connection needed.
 */
import { choreRepo } from './choreRepo';
import * as db from '../db';

jest.mock('../db');

const mockWithTransaction = db.withTransaction as jest.MockedFunction<typeof db.withTransaction>;

function buildClient(results: { rows: any[] }[]) {
  let callIndex = 0;
  return {
    query: jest.fn(async () => results[callIndex++] ?? { rows: [] }),
  } as any;
}

describe('choreRepo.completeGroupChore — collaborative split', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns partial when not all assignees have completed', async () => {
    const client = buildClient([
      { rows: [{ id: 'c1', reward_points: 30, status: 'pending', assigned_to_group: true, split_type: 'equal' }] },
      {
        rows: [
          { child_id: 'kid1', weight: 1, completed_at: null },
          { child_id: 'kid2', weight: 1, completed_at: null },
          { child_id: 'kid3', weight: 1, completed_at: null },
        ],
      },
      { rows: [] }, // UPDATE assignment
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await choreRepo.completeGroupChore({
      choreId: 'c1', childId: 'kid1', completedByUserId: 'parent1',
    });

    expect(result.status).toBe('partial');
    if (result.status === 'partial') {
      expect(result.completedCount).toBe(1);
      expect(result.totalCount).toBe(3);
    }
  });

  it('returns complete and splits points equally among 3 children', async () => {
    // All 3 completing; kid3 is the last one
    const makeCompRow = (childId: string, pts: number) => ({
      id: `comp-${childId}`,
      chore_id: 'c1',
      child_id: childId,
      completed_by_user_id: 'parent1',
      approved_by_user_id: null,
      points_awarded: pts,
      notes: null,
      group_completion_id: 'group-uuid-1',
      completed_at: new Date(),
    });

    const client = buildClient([
      { rows: [{ id: 'c1', reward_points: 30, status: 'pending', assigned_to_group: true, split_type: 'equal' }] },
      {
        rows: [
          { child_id: 'kid1', weight: 1, completed_at: new Date() },
          { child_id: 'kid2', weight: 1, completed_at: new Date() },
          { child_id: 'kid3', weight: 1, completed_at: null },   // kid3 is last
        ],
      },
      { rows: [] },                             // UPDATE assignment (kid3)
      { rows: [{ id: 'group-uuid-1' }] },       // gen_random_uuid
      { rows: [{ balance: '0' }] },             // balance kid1
      { rows: [makeCompRow('kid1', 10)] },      // INSERT completion kid1
      { rows: [] },                             // INSERT ledger kid1
      { rows: [{ balance: '5' }] },             // balance kid2
      { rows: [makeCompRow('kid2', 10)] },      // INSERT completion kid2
      { rows: [] },                             // INSERT ledger kid2
      { rows: [{ balance: '20' }] },            // balance kid3
      { rows: [makeCompRow('kid3', 10)] },      // INSERT completion kid3
      { rows: [] },                             // INSERT ledger kid3
      { rows: [] },                             // UPDATE chores
      { rows: [] },                             // INSERT audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await choreRepo.completeGroupChore({
      choreId: 'c1', childId: 'kid3', completedByUserId: 'parent1',
    });

    expect(result.status).toBe('complete');
    if (result.status === 'complete') {
      expect(result.completions).toHaveLength(3);
      result.completions.forEach((comp) => {
        expect(comp.pointsAwarded).toBe(10);       // 30 / 3 = 10
        expect(comp.groupCompletionId).toBe('group-uuid-1');
      });
      expect(result.balances['kid1']).toBe(10);    // 0 + 10
      expect(result.balances['kid2']).toBe(15);    // 5 + 10
      expect(result.balances['kid3']).toBe(30);    // 20 + 10
    }
  });

  it('rounds split points to nearest whole number', async () => {
    // 10 pts / 3 = 3.33… → Math.round → 3 each
    const makeCompRow = (childId: string) => ({
      id: `comp-${childId}`, chore_id: 'c2', child_id: childId,
      completed_by_user_id: 'u', approved_by_user_id: null, points_awarded: 3,
      notes: null, group_completion_id: 'gu2', completed_at: new Date(),
    });

    const client = buildClient([
      { rows: [{ id: 'c2', reward_points: 10, status: 'pending', assigned_to_group: true, split_type: 'equal' }] },
      {
        rows: [
          { child_id: 'kid1', weight: 1, completed_at: new Date() },
          { child_id: 'kid2', weight: 1, completed_at: new Date() },
          { child_id: 'kid3', weight: 1, completed_at: null },
        ],
      },
      { rows: [] },
      { rows: [{ id: 'gu2' }] },
      { rows: [{ balance: '0' }] }, { rows: [makeCompRow('kid1')] }, { rows: [] },
      { rows: [{ balance: '0' }] }, { rows: [makeCompRow('kid2')] }, { rows: [] },
      { rows: [{ balance: '0' }] }, { rows: [makeCompRow('kid3')] }, { rows: [] },
      { rows: [] }, { rows: [] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await choreRepo.completeGroupChore({ choreId: 'c2', childId: 'kid3', completedByUserId: 'u' });

    expect(result.status).toBe('complete');
    if (result.status === 'complete') {
      result.completions.forEach((comp) => {
        expect(Number.isInteger(comp.pointsAwarded)).toBe(true);
        expect(comp.pointsAwarded).toBe(3);        // Math.round(10/3) = 3
      });
    }
  });

  it('distributes points by weight for weighted split_type', async () => {
    // 100 pts, kid1 weight=1, kid2 weight=3  → totalWeight=4 → 25 / 75
    const client = buildClient([
      { rows: [{ id: 'c3', reward_points: 100, status: 'pending', assigned_to_group: true, split_type: 'weighted' }] },
      {
        rows: [
          { child_id: 'kid1', weight: 1, completed_at: new Date() },
          { child_id: 'kid2', weight: 3, completed_at: null },
        ],
      },
      { rows: [] },
      { rows: [{ id: 'gu3' }] },
      { rows: [{ balance: '0' }] },
      { rows: [{ id: 'comp1', chore_id: 'c3', child_id: 'kid1', completed_by_user_id: 'u', approved_by_user_id: null, points_awarded: 25, notes: null, group_completion_id: 'gu3', completed_at: new Date() }] },
      { rows: [] },
      { rows: [{ balance: '0' }] },
      { rows: [{ id: 'comp2', chore_id: 'c3', child_id: 'kid2', completed_by_user_id: 'u', approved_by_user_id: null, points_awarded: 75, notes: null, group_completion_id: 'gu3', completed_at: new Date() }] },
      { rows: [] },
      { rows: [] }, { rows: [] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await choreRepo.completeGroupChore({ choreId: 'c3', childId: 'kid2', completedByUserId: 'u' });

    expect(result.status).toBe('complete');
    if (result.status === 'complete') {
      const byChild = Object.fromEntries(result.completions.map((c) => [c.childId, c.pointsAwarded]));
      expect(byChild['kid1']).toBe(25);   // Math.round(100 * 1/4)
      expect(byChild['kid2']).toBe(75);   // Math.round(100 * 3/4)
    }
  });

  it('throws if child is not assigned to the chore', async () => {
    const client = buildClient([
      { rows: [{ id: 'c4', reward_points: 20, status: 'pending', assigned_to_group: true, split_type: 'equal' }] },
      { rows: [{ child_id: 'kid1', weight: 1, completed_at: null }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      choreRepo.completeGroupChore({ choreId: 'c4', childId: 'intruder', completedByUserId: 'u' })
    ).rejects.toThrow('not assigned');
  });

  it('throws if chore is already completed', async () => {
    const client = buildClient([
      { rows: [{ id: 'c5', reward_points: 10, status: 'completed', assigned_to_group: true, split_type: 'equal' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      choreRepo.completeGroupChore({ choreId: 'c5', childId: 'kid1', completedByUserId: 'u' })
    ).rejects.toThrow('already completed');
  });

  it('throws if called on a non-group chore', async () => {
    const client = buildClient([
      { rows: [{ id: 'c6', reward_points: 10, status: 'pending', assigned_to_group: false, split_type: 'equal' }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      choreRepo.completeGroupChore({ choreId: 'c6', childId: 'kid1', completedByUserId: 'u' })
    ).rejects.toThrow('completeChore()');
  });
});

describe('choreRepo.completeChore — single child', () => {
  it('throws if called on a group chore', async () => {
    const client = buildClient([
      { rows: [{ id: 'c7', reward_points: 10, status: 'pending', assigned_to_group: true }] },
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    await expect(
      choreRepo.completeChore({ choreId: 'c7', childId: 'kid1', completedByUserId: 'u' })
    ).rejects.toThrow('completeGroupChore()');
  });

  it('awards full points to a single child and returns new balance', async () => {
    const completionRow = {
      id: 'comp-s1', chore_id: 'c8', child_id: 'kid1',
      completed_by_user_id: 'u', approved_by_user_id: null,
      points_awarded: 20, notes: null, group_completion_id: null,
      completed_at: new Date(),
    };
    const client = buildClient([
      { rows: [{ id: 'c8', reward_points: 20, status: 'pending', assigned_to_group: false }] },
      { rows: [{ balance: '50' }] },
      { rows: [completionRow] },
      { rows: [] }, // point_ledger
      { rows: [] }, // UPDATE chores
      { rows: [] }, // audit_log
    ]);
    mockWithTransaction.mockImplementationOnce(async (fn: any) => fn(client));

    const result = await choreRepo.completeChore({ choreId: 'c8', childId: 'kid1', completedByUserId: 'u' });

    expect(result.completion.pointsAwarded).toBe(20);
    expect(result.newBalance).toBe(70);   // 50 + 20
  });
});
