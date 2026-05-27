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
  assignedToGroup: boolean;
  splitType: 'equal' | 'weighted';
  createdAt: Date;
}

export interface ChoreAssignment {
  choreId: string;
  childId: string;
  weight: number;
  completedAt: Date | null;
  completedByUserId: string | null;
}

export interface ChoreCompletion {
  id: string;
  choreId: string;
  childId: string;
  completedByUserId: string;
  approvedByUserId: string | null;
  pointsAwarded: number;
  notes: string | null;
  groupCompletionId: string | null;
  completedAt: Date;
}

export type GroupCompleteResult =
  | { status: 'partial'; completedCount: number; totalCount: number }
  | { status: 'complete'; completions: ChoreCompletion[]; balances: Record<string, number> };

export const choreRepo = {
  async findById(id: string): Promise<Chore | null> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, child_id, title, description, frequency, reward_points, due_date,
              status, assigned_to_group, split_type, created_at
       FROM chores WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapChore(rows[0]) : null;
  },

  async findByParent(parentUserId: string): Promise<Chore[]> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, child_id, title, description, frequency, reward_points, due_date,
              status, assigned_to_group, split_type, created_at
       FROM chores WHERE parent_user_id = $1 ORDER BY created_at DESC`,
      [parentUserId]
    );
    return rows.map(mapChore);
  },

  async findByChild(childId: string): Promise<Chore[]> {
    const { rows } = await getPool().query(
      `SELECT DISTINCT c.id, c.parent_user_id, c.child_id, c.title, c.description,
              c.frequency, c.reward_points, c.due_date, c.status,
              c.assigned_to_group, c.split_type, c.created_at
       FROM chores c
       LEFT JOIN chore_assignments ca ON ca.chore_id = c.id AND ca.child_id = $1
       WHERE (c.child_id = $1 OR ca.child_id = $1)
         AND c.status IN ('pending','in_progress')
       ORDER BY c.due_date ASC NULLS LAST`,
      [childId]
    );
    return rows.map(mapChore);
  },

  async findAssignments(choreId: string): Promise<ChoreAssignment[]> {
    const { rows } = await getPool().query(
      `SELECT chore_id, child_id, weight, completed_at, completed_by_user_id
       FROM chore_assignments WHERE chore_id = $1`,
      [choreId]
    );
    return rows.map(mapAssignment);
  },

  async create(client: PoolClient, data: {
    parentUserId: string;
    childId?: string;
    title: string;
    description?: string;
    frequency: Chore['frequency'];
    rewardPoints: number;
    dueDate?: Date;
    assignedToGroup?: boolean;
    splitType?: 'equal' | 'weighted';
    groupChildIds?: string[];    // list of child UUIDs for group chores
    groupWeights?: number[];     // parallel array of weights (optional)
  }): Promise<Chore> {
    const isGroup = data.assignedToGroup ?? false;
    const splitType = data.splitType ?? 'equal';

    const { rows } = await client.query(
      `INSERT INTO chores (parent_user_id, child_id, title, description, frequency,
                           reward_points, due_date, assigned_to_group, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, parent_user_id, child_id, title, description, frequency, reward_points,
                 due_date, status, assigned_to_group, split_type, created_at`,
      [data.parentUserId,
       isGroup ? null : (data.childId || null),
       data.title,
       data.description || null,
       data.frequency,
       data.rewardPoints,
       data.dueDate || null,
       isGroup,
       splitType]
    );
    const chore = mapChore(rows[0]);

    if (isGroup && data.groupChildIds && data.groupChildIds.length > 0) {
      for (let i = 0; i < data.groupChildIds.length; i++) {
        const weight = data.groupWeights?.[i] ?? 1;
        await client.query(
          `INSERT INTO chore_assignments (chore_id, child_id, weight) VALUES ($1, $2, $3)
           ON CONFLICT (chore_id, child_id) DO NOTHING`,
          [chore.id, data.groupChildIds[i], weight]
        );
      }
    } else if (!isGroup && data.childId) {
      await client.query(
        `INSERT INTO chore_assignments (chore_id, child_id, weight) VALUES ($1, $2, 1)
         ON CONFLICT (chore_id, child_id) DO NOTHING`,
        [chore.id, data.childId]
      );
    }

    return chore;
  },

  async updateStatus(id: string, status: Chore['status']): Promise<void> {
    await getPool().query(`UPDATE chores SET status = $1 WHERE id = $2`, [status, id]);
  },

  /** Complete a chore for a single (non-group) child. */
  async completeChore(data: {
    choreId: string;
    childId: string;
    completedByUserId: string;
    approvedByUserId?: string;
    notes?: string;
  }): Promise<{ completion: ChoreCompletion; newBalance: number }> {
    return withTransaction(async (client) => {
      const { rows: choreRows } = await client.query(
        `SELECT id, reward_points, status, assigned_to_group FROM chores WHERE id = $1 FOR UPDATE`,
        [data.choreId]
      );
      if (choreRows.length === 0) throw new Error(`Chore ${data.choreId} not found`);
      const chore = choreRows[0];
      if (chore.status === 'completed') throw new Error('Chore already completed');
      if (chore.assigned_to_group) throw new Error('Use completeGroupChore() for group chores');

      const { rows: balanceRows } = await client.query(
        `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
        [data.childId]
      );
      const currentBalance = Number(balanceRows[0].balance);
      const newBalance = currentBalance + chore.reward_points;

      const { rows: compRows } = await client.query(
        `INSERT INTO chore_completions
           (chore_id, child_id, completed_by_user_id, approved_by_user_id, points_awarded, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, chore_id, child_id, completed_by_user_id, approved_by_user_id,
                   points_awarded, notes, group_completion_id, completed_at`,
        [data.choreId, data.childId, data.completedByUserId,
         data.approvedByUserId || null, chore.reward_points, data.notes || null]
      );

      await client.query(
        `INSERT INTO point_ledger
           (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
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

      return { completion: mapCompletion(compRows[0]), newBalance };
    });
  },

  /**
   * Mark a child's assignment as done for a GROUP chore.
   * Returns 'partial' until all assignees are done, then 'complete' with split points.
   * Points are rounded to the nearest whole number.
   */
  async completeGroupChore(data: {
    choreId: string;
    childId: string;
    completedByUserId: string;
    notes?: string;
  }): Promise<GroupCompleteResult> {
    return withTransaction(async (client) => {
      const { rows: choreRows } = await client.query(
        `SELECT id, reward_points, status, assigned_to_group, split_type
         FROM chores WHERE id = $1 FOR UPDATE`,
        [data.choreId]
      );
      if (choreRows.length === 0) throw new Error(`Chore ${data.choreId} not found`);
      const chore = choreRows[0];
      if (chore.status === 'completed') throw new Error('Chore already completed');
      if (!chore.assigned_to_group) throw new Error('Use completeChore() for single-child chores');

      // Verify this child is actually assigned
      const { rows: assignRows } = await client.query(
        `SELECT child_id, weight, completed_at
         FROM chore_assignments WHERE chore_id = $1 FOR UPDATE`,
        [data.choreId]
      );
      const myAssignment = assignRows.find((r: any) => r.child_id === data.childId);
      if (!myAssignment) throw new Error('Child is not assigned to this chore');
      if (myAssignment.completed_at !== null) throw new Error('Child already completed this chore');

      // Mark this child's assignment complete
      await client.query(
        `UPDATE chore_assignments
         SET completed_at = now(), completed_by_user_id = $1
         WHERE chore_id = $2 AND child_id = $3`,
        [data.completedByUserId, data.choreId, data.childId]
      );

      const totalCount = assignRows.length;
      const completedCount = assignRows.filter((r: any) => r.child_id === data.childId || r.completed_at !== null).length;

      // Are ALL assignees now done?
      if (completedCount < totalCount) {
        return { status: 'partial', completedCount, totalCount };
      }

      // ALL done → calculate split points
      const totalPoints: number = chore.reward_points;
      const groupCompletionId: string = (
        await client.query(`SELECT gen_random_uuid() AS id`)
      ).rows[0].id;

      const completions: ChoreCompletion[] = [];
      const balances: Record<string, number> = {};

      for (const assignment of assignRows) {
        const cid: string = assignment.child_id;
        const weight: number = Number(assignment.weight);

        let pointsForChild: number;
        if (chore.split_type === 'weighted') {
          const totalWeight = assignRows.reduce((s: number, r: any) => s + Number(r.weight), 0);
          pointsForChild = Math.round(totalPoints * (weight / totalWeight));
        } else {
          pointsForChild = Math.round(totalPoints / totalCount);
        }

        const { rows: balRows } = await client.query(
          `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
          [cid]
        );
        const newBalance = Number(balRows[0].balance) + pointsForChild;
        balances[cid] = newBalance;

        const { rows: compRows } = await client.query(
          `INSERT INTO chore_completions
             (chore_id, child_id, completed_by_user_id, points_awarded, notes, group_completion_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, chore_id, child_id, completed_by_user_id, approved_by_user_id,
                     points_awarded, notes, group_completion_id, completed_at`,
          [data.choreId, cid, data.completedByUserId, pointsForChild,
           data.notes || null, groupCompletionId]
        );

        await client.query(
          `INSERT INTO point_ledger
             (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
           VALUES ($1, $2, $3, 'chore_completion', $4, $5, $6)`,
          [cid, pointsForChild, `Group chore completed: ${data.choreId}`,
           compRows[0].id, newBalance, data.completedByUserId]
        );

        completions.push(mapCompletion(compRows[0]));
      }

      await client.query(`UPDATE chores SET status = 'completed' WHERE id = $1`, [data.choreId]);

      await client.query(
        `INSERT INTO audit_log (table_name, operation, user_id, record_id, new_values)
         VALUES ('chore_completions', 'INSERT', $1, $2, $3)`,
        [data.completedByUserId, groupCompletionId,
         JSON.stringify({ choreId: data.choreId, groupCompletionId, totalPoints })]
      );

      return { status: 'complete', completions, balances };
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
    assignedToGroup: row.assigned_to_group ?? false,
    splitType: row.split_type ?? 'equal',
    createdAt: row.created_at,
  };
}

function mapAssignment(row: any): ChoreAssignment {
  return {
    choreId: row.chore_id,
    childId: row.child_id,
    weight: row.weight,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
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
    groupCompletionId: row.group_completion_id ?? null,
    completedAt: row.completed_at,
  };
}
