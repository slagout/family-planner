import { getPool, withTransaction } from '../db';

export interface RedemptionRequest {
  id: string;
  childId: string;
  rewardId: string;
  pointsSpent: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  requestedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
}

export const redemptionRequestRepo = {
  async findById(id: string): Promise<RedemptionRequest | null> {
    const { rows } = await getPool().query(
      `SELECT id, child_id, reward_id, points_spent, status, requested_at,
              approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason
       FROM redemption_requests WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapRedemption(rows[0]) : null;
  },

  async findByChild(childId: string): Promise<RedemptionRequest[]> {
    const { rows } = await getPool().query(
      `SELECT id, child_id, reward_id, points_spent, status, requested_at,
              approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason
       FROM redemption_requests WHERE child_id = $1 ORDER BY requested_at DESC`,
      [childId]
    );
    return rows.map(mapRedemption);
  },

  async findPendingByParent(parentUserId: string): Promise<RedemptionRequest[]> {
    const { rows } = await getPool().query(
      `SELECT rr.id, rr.child_id, rr.reward_id, rr.points_spent, rr.status, rr.requested_at,
              rr.approved_by, rr.approved_at, rr.fulfilled_at, rr.cancelled_at, rr.cancel_reason
       FROM redemption_requests rr
       JOIN rewards r ON r.id = rr.reward_id
       WHERE r.parent_user_id = $1 AND rr.status IN ('pending','approved')
       ORDER BY rr.requested_at ASC`,
      [parentUserId]
    );
    return rows.map(mapRedemption);
  },

  /**
   * Child requests to redeem a reward.
   * Validates that the child has enough points (balance check).
   * Does NOT deduct points yet — that happens on approval.
   */
  async requestRedemption(data: {
    childId: string;
    rewardId: string;
    requestedByUserId: string;
  }): Promise<RedemptionRequest> {
    return withTransaction(async (client) => {
      const { rows: rRows } = await client.query(
        `SELECT id, point_cost, max_redemptions, is_active FROM rewards WHERE id = $1 FOR UPDATE`,
        [data.rewardId]
      );
      if (rRows.length === 0) throw new Error(`Reward ${data.rewardId} not found`);
      const reward = rRows[0];
      if (!reward.is_active) throw new Error('Reward is no longer active');

      // Check max redemptions cap
      if (reward.max_redemptions !== null) {
        const { rows: cntRows } = await client.query(
          `SELECT COUNT(*) AS cnt FROM redemption_requests
           WHERE reward_id = $1 AND status IN ('approved','fulfilled')`,
          [data.rewardId]
        );
        if (Number(cntRows[0].cnt) >= reward.max_redemptions) {
          throw new Error('Reward has reached its maximum redemption count');
        }
      }

      // Verify child has enough points
      const { rows: balRows } = await client.query(
        `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
        [data.childId]
      );
      const balance = Number(balRows[0].balance);
      if (balance < reward.point_cost) {
        throw new Error(`Insufficient points: need ${reward.point_cost}, have ${balance}`);
      }

      const { rows } = await client.query(
        `INSERT INTO redemption_requests (child_id, reward_id, points_spent)
         VALUES ($1, $2, $3)
         RETURNING id, child_id, reward_id, points_spent, status, requested_at,
                   approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason`,
        [data.childId, data.rewardId, reward.point_cost]
      );

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('redemption_requests', 'INSERT', $1, $2, $3)`,
        [data.requestedByUserId, rows[0].id,
         JSON.stringify({ childId: data.childId, rewardId: data.rewardId, pointsSpent: reward.point_cost })]
      );

      return mapRedemption(rows[0]);
    });
  },

  /**
   * Parent approves a pending redemption.
   * Atomically deducts points and updates status to 'approved'.
   */
  async approveRedemption(id: string, approvedByUserId: string): Promise<RedemptionRequest> {
    return withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT id, child_id, reward_id, points_spent, status
         FROM redemption_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (reqRows.length === 0) throw new Error(`Redemption request ${id} not found`);
      const req = reqRows[0];
      if (req.status !== 'pending') throw new Error(`Cannot approve a ${req.status} request`);

      // Verify child still has enough points
      const { rows: balRows } = await client.query(
        `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
        [req.child_id]
      );
      const balance = Number(balRows[0].balance);
      if (balance < req.points_spent) {
        throw new Error(`Insufficient points at approval time: need ${req.points_spent}, have ${balance}`);
      }
      const newBalance = balance - req.points_spent;

      // Deduct points (append-only)
      await client.query(
        `INSERT INTO point_ledger
           (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
         VALUES ($1, $2, $3, 'reward_redemption', $4, $5, $6)`,
        [req.child_id, -req.points_spent, `Reward approved: ${req.reward_id}`,
         id, newBalance, approvedByUserId]
      );

      const { rows } = await client.query(
        `UPDATE redemption_requests
         SET status = 'approved', approved_by = $1, approved_at = now()
         WHERE id = $2
         RETURNING id, child_id, reward_id, points_spent, status, requested_at,
                   approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason`,
        [approvedByUserId, id]
      );

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('redemption_requests', 'UPDATE', $1, $2, $3)`,
        [approvedByUserId, id, JSON.stringify({ status: 'approved', newBalance })]
      );

      return mapRedemption(rows[0]);
    });
  },

  /** Parent marks an approved redemption as physically fulfilled. */
  async fulfillRedemption(id: string, userId: string): Promise<RedemptionRequest> {
    return withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT id, status FROM redemption_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (reqRows.length === 0) throw new Error(`Redemption request ${id} not found`);
      if (reqRows[0].status !== 'approved') {
        throw new Error(`Cannot fulfill a ${reqRows[0].status} request — it must be approved first`);
      }

      const { rows } = await client.query(
        `UPDATE redemption_requests SET status = 'fulfilled', fulfilled_at = now()
         WHERE id = $1
         RETURNING id, child_id, reward_id, points_spent, status, requested_at,
                   approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason`,
        [id]
      );

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('redemption_requests', 'UPDATE', $1, $2, $3)`,
        [userId, id, JSON.stringify({ status: 'fulfilled' })]
      );

      return mapRedemption(rows[0]);
    });
  },

  /**
   * Cancel a pending or approved redemption.
   * If approved (points already deducted), refunds via positive ledger entry.
   */
  async cancelRedemption(data: {
    id: string;
    cancelledByUserId: string;
    reason?: string;
  }): Promise<RedemptionRequest> {
    return withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT id, child_id, points_spent, status FROM redemption_requests WHERE id = $1 FOR UPDATE`,
        [data.id]
      );
      if (reqRows.length === 0) throw new Error(`Redemption request ${data.id} not found`);
      const req = reqRows[0];
      if (req.status === 'fulfilled') throw new Error('Cannot cancel a fulfilled redemption');
      if (req.status === 'cancelled') throw new Error('Redemption already cancelled');

      // Refund points if they were already deducted (approved state)
      if (req.status === 'approved') {
        const { rows: balRows } = await client.query(
          `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
          [req.child_id]
        );
        const newBalance = Number(balRows[0].balance) + req.points_spent;

        await client.query(
          `INSERT INTO point_ledger
             (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
           VALUES ($1, $2, $3, 'adjustment', $4, $5, $6)`,
          [req.child_id, req.points_spent, `Redemption cancelled — refund: ${data.id}`,
           data.id, newBalance, data.cancelledByUserId]
        );
      }

      const { rows } = await client.query(
        `UPDATE redemption_requests
         SET status = 'cancelled', cancelled_at = now(), cancel_reason = $1
         WHERE id = $2
         RETURNING id, child_id, reward_id, points_spent, status, requested_at,
                   approved_by, approved_at, fulfilled_at, cancelled_at, cancel_reason`,
        [data.reason || null, data.id]
      );

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('redemption_requests', 'UPDATE', $1, $2, $3)`,
        [data.cancelledByUserId, data.id,
         JSON.stringify({ status: 'cancelled', reason: data.reason || null })]
      );

      return mapRedemption(rows[0]);
    });
  },
};

function mapRedemption(row: any): RedemptionRequest {
  return {
    id: row.id,
    childId: row.child_id,
    rewardId: row.reward_id,
    pointsSpent: row.points_spent,
    status: row.status,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    fulfilledAt: row.fulfilled_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
  };
}
