import { getPool, withTransaction } from '../db';

export interface Reward {
  id: string;
  parentUserId: string;
  title: string;
  description: string | null;
  pointCost: number;
  maxRedemptions: number | null;
  isActive: boolean;
  createdAt: Date;
}

export const rewardRepo = {
  async findByParent(parentUserId: string): Promise<Reward[]> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, title, description, point_cost, max_redemptions, is_active, created_at
       FROM rewards WHERE parent_user_id = $1 AND is_active = true ORDER BY point_cost`,
      [parentUserId]
    );
    return rows.map(mapReward);
  },

  async create(data: {
    parentUserId: string;
    title: string;
    description?: string;
    pointCost: number;
    maxRedemptions?: number;
  }): Promise<Reward> {
    const { rows } = await getPool().query(
      `INSERT INTO rewards (parent_user_id, title, description, point_cost, max_redemptions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, parent_user_id, title, description, point_cost, max_redemptions, is_active, created_at`,
      [data.parentUserId, data.title, data.description || null, data.pointCost, data.maxRedemptions || null]
    );
    return mapReward(rows[0]);
  },

  async redeem(data: {
    rewardId: string;
    childId: string;
    approvedByUserId: string;
  }): Promise<{ redemptionId: string; newBalance: number }> {
    return withTransaction(async (client) => {
      const { rows: rRows } = await client.query(
        `SELECT id, point_cost, max_redemptions, is_active FROM rewards WHERE id = $1 FOR UPDATE`,
        [data.rewardId]
      );
      if (rRows.length === 0) throw new Error(`Reward ${data.rewardId} not found`);
      const reward = rRows[0];
      if (!reward.is_active) throw new Error('Reward is no longer active');

      if (reward.max_redemptions !== null) {
        const { rows: countRows } = await client.query(
          `SELECT COUNT(*) as cnt FROM reward_redemptions WHERE reward_id = $1`,
          [data.rewardId]
        );
        if (Number(countRows[0].cnt) >= reward.max_redemptions) {
          throw new Error('Reward has reached maximum redemption count');
        }
      }

      const { rows: balRows } = await client.query(
        `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
        [data.childId]
      );
      const balance = Number(balRows[0].balance);
      if (balance < reward.point_cost) {
        throw new Error(`Insufficient points: need ${reward.point_cost}, have ${balance}`);
      }

      const newBalance = balance - reward.point_cost;

      const { rows: redRows } = await client.query(
        `INSERT INTO reward_redemptions (reward_id, child_id, approved_by_user_id, points_spent)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [data.rewardId, data.childId, data.approvedByUserId, reward.point_cost]
      );

      await client.query(
        `INSERT INTO point_ledger (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
         VALUES ($1, $2, $3, 'reward_redemption', $4, $5, $6)`,
        [data.childId, -reward.point_cost, `Reward redeemed: ${reward.id}`,
         redRows[0].id, newBalance, data.approvedByUserId]
      );

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('reward_redemptions', 'INSERT', $1, $2, $3)`,
        [data.approvedByUserId, redRows[0].id,
         JSON.stringify({ rewardId: data.rewardId, childId: data.childId, pointsSpent: reward.point_cost })]
      );

      return { redemptionId: redRows[0].id, newBalance };
    });
  },
};

function mapReward(row: any): Reward {
  return {
    id: row.id,
    parentUserId: row.parent_user_id,
    title: row.title,
    description: row.description,
    pointCost: row.point_cost,
    maxRedemptions: row.max_redemptions,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
