import { PoolClient } from 'pg';
import { getPool, withTransaction } from '../db';

export interface Chore {
  id: string;
  parentUserId: string;
  childId: string | null;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  rewardPoints: number;
  dueDate: Date | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface ChoreCompletion {
  id: string;
  choreId: string;
  childId: string;
  completedByUserId: string;
  approvedByUserId: string | null;
  pointsAwarded: number;
  notes: string | null;
  completedAt: Date;
}

export const choreRepo = {
  async findById(id: string): Promise<Chore | null> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, child_id, title, description, frequency, reward_points, due_date, status, created_at
       FROM chores WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapChore(rows[0]) : null;
  },

  async findByParent(parentUserId: string): Promise<Chore[]> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, child_id, title, description, frequency, reward_points, due_date, status, created_at
       FROM chores WHERE parent_user_id = $1 ORDER BY created_at DESC`,
      [parentUserId]
    );
    return rows.map(mapChore);
  },

  async findByChild(childId: string): Promise<Chore[]> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, child_id, title, description, frequency, reward_points, due_date, status, created_at
       FROM chores WHERE child_id = $1 AND status IN ('pending','in_progress') ORDER BY due_date ASC NULLS LAST`,
      [childId]
    );
    return rows.map(mapChore);
  },

  async create(client: PoolClient, data: {
    parentUserId: string;
    childId?: string;
    title: string;
    description?: string;
    frequency: Chore['frequency'];
    rewardPoints: number;
    dueDate?: Date;
  }): Promise<Chore> {
    const { rows } = await client.query(
      `INSERT INTO chores (parent_user_id, child_id, title, description, frequency, reward_points, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, parent_user_id, child_id, title, description, frequency, reward_points, due_date, status, created_at`,
      [data.parentUserId, data.childId || null, data.title, data.description || null,
       data.frequency, data.rewardPoints, data.dueDate || null]
    );
    return mapChore(rows[0]);
  },

  async updateStatus(id: string, status: Chore['status']): Promise<void> {
    await getPool().query(`UPDATE chores SET status = $1 WHERE id = $2`, [status, id]);
  },

  async completeChore(data: {
    choreId: string;
    childId: string;
    completedByUserId: string;
    approvedByUserId?: string;
    notes?: string;
  }): Promise<{ completion: ChoreCompletion; newBalance: number }> {
    return withTransaction(async (client) => {
      const { rows: choreRows } = await client.query(
        `SELECT id, reward_points, status FROM chores WHERE id = $1 FOR UPDATE`,
        [data.choreId]
      );
      if (choreRows.length === 0) throw new Error(`Chore ${data.choreId} not found`);
      const chore = choreRows[0];
      if (chore.status === 'completed') throw new Error('Chore already completed');

      const { rows: balanceRows } = await client.query(
        `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
        [data.childId]
      );
      const currentBalance = Number(balanceRows[0].balance);
      const newBalance = currentBalance + chore.reward_points;

      const { rows: compRows } = await client.query(
        `INSERT INTO chore_completions (chore_id, child_id, completed_by_user_id, approved_by_user_id, points_awarded, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, chore_id, child_id, completed_by_user_id, approved_by_user_id, points_awarded, notes, completed_at`,
        [data.choreId, data.childId, data.completedByUserId,
         data.approvedByUserId || null, chore.reward_points, data.notes || null]
      );

      await client.query(
        `INSERT INTO point_ledger (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
         VALUES ($1, $2, $3, 'chore_completion', $4, $5, $6)`,
        [data.childId, chore.reward_points, `Chore completed: ${data.choreId}`,
         compRows[0].id, newBalance, data.completedByUserId]
      );

      await client.query(`UPDATE chores SET status = 'completed' WHERE id = $1`, [data.choreId]);

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('chore_completions', 'INSERT', $1, $2, $3)`,
        [data.completedByUserId, compRows[0].id,
         JSON.stringify({ choreId: data.choreId, childId: data.childId, pointsAwarded: chore.reward_points })]
      );

      return {
        completion: mapCompletion(compRows[0]),
        newBalance,
      };
    });
  },
};

function mapChore(row: any): Chore {
  return {
    id: row.id,
    parentUserId: row.parent_user_id,
    childId: row.child_id,
    title: row.title,
    description: row.description,
    frequency: row.frequency,
    rewardPoints: row.reward_points,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapCompletion(row: any): ChoreCompletion {
  return {
    id: row.id,
    choreId: row.chore_id,
    childId: row.child_id,
    completedByUserId: row.completed_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    pointsAwarded: row.points_awarded,
    notes: row.notes,
    completedAt: row.completed_at,
  };
}
