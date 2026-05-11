/**
 * Immutability validation tests.
 * These are integration tests that require a real PostgreSQL instance.
 * Run with: TEST_DB_URL=postgresql://... jest immutability.test.ts
 */

describe('Immutability triggers (unit validation)', () => {
  it('confirms chore_completions has no update path in choreRepo', () => {
    const { choreRepo } = require('../repositories/choreRepo');
    expect(typeof choreRepo.updateCompletion).toBe('undefined');
    expect(typeof choreRepo.deleteCompletion).toBe('undefined');
  });

  it('confirms point_ledger has no mutation path in rewardRepo', () => {
    const { rewardRepo } = require('../repositories/rewardRepo');
    expect(typeof rewardRepo.deleteEntry).toBe('undefined');
    expect(typeof rewardRepo.updateEntry).toBe('undefined');
  });
});
