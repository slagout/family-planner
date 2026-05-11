import { choreRepo } from '../repositories/choreRepo';
import { getPool } from '../db';

jest.mock('../db', () => ({
  getPool: jest.fn(),
  withTransaction: jest.fn(),
}));

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPool as jest.Mock).mockReturnValue(mockPool);
});

describe('choreRepo', () => {
  describe('findById', () => {
    it('returns null when chore not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await choreRepo.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('returns mapped chore when found', async () => {
      const mockRow = {
        id: 'chore-uuid',
        parent_user_id: 'parent-uuid',
        child_id: 'child-uuid',
        title: 'Clean room',
        description: null,
        frequency: 'daily',
        reward_points: 10,
        due_date: null,
        status: 'pending',
        created_at: new Date('2024-01-01'),
      };
      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });
      const result = await choreRepo.findById('chore-uuid');
      expect(result).toMatchObject({
        id: 'chore-uuid',
        title: 'Clean room',
        rewardPoints: 10,
        status: 'pending',
      });
    });
  });
});
