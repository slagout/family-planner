import { Request, Response } from 'express';
import { pool } from '../db';

// ─── Children ──────────────────────────────────────────────────────────────────

export async function listChildren(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, name, date_of_birth, allergies, dietary_restrictions, avatar_url, is_active, created_at
     FROM children
     WHERE parent_user_id = $1 AND is_active = true
     ORDER BY name`,
    [req.user!.userId],
  );
  res.json(rows);
}

export async function createChild(req: Request, res: Response): Promise<void> {
  const { name, date_of_birth, allergies, dietary_restrictions, avatar_url } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Child name is required' }); return; }

  const { rows } = await pool.query(
    `INSERT INTO children (parent_user_id, name, date_of_birth, allergies, dietary_restrictions, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.user!.userId,
      name.trim(),
      date_of_birth || null,
      allergies   || [],
      dietary_restrictions || [],
      avatar_url  || null,
    ],
  );
  res.status(201).json(rows[0]);
}

export async function updateChild(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, date_of_birth, allergies, dietary_restrictions, avatar_url, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE children
     SET name                 = COALESCE($1, name),
         date_of_birth        = COALESCE($2, date_of_birth),
         allergies            = COALESCE($3, allergies),
         dietary_restrictions = COALESCE($4, dietary_restrictions),
         avatar_url           = COALESCE($5, avatar_url),
         is_active            = COALESCE($6, is_active)
     WHERE id = $7 AND parent_user_id = $8
     RETURNING *`,
    [name ?? null, date_of_birth ?? null, allergies ?? null, dietary_restrictions ?? null, avatar_url ?? null, is_active ?? null, id, req.user!.userId],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Child not found' }); return; }
  res.json(rows[0]);
}

// ─── Chores ────────────────────────────────────────────────────────────────────

export async function listChores(req: Request, res: Response): Promise<void> {
  const { child_id, status, frequency } = req.query;
  const conditions = ['c.parent_user_id = $1'];
  const params: unknown[] = [req.user!.userId];
  let idx = 2;

  if (child_id)  { conditions.push(`c.child_id = $${idx++}`);  params.push(child_id); }
  if (status)    { conditions.push(`c.status = $${idx++}`);    params.push(status); }
  if (frequency) { conditions.push(`c.frequency = $${idx++}`); params.push(frequency); }

  const { rows } = await pool.query(
    `SELECT c.*, ch.name AS child_name
     FROM chores c
     LEFT JOIN children ch ON ch.id = c.child_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.due_date ASC NULLS LAST, c.created_at DESC`,
    params,
  );
  res.json(rows);
}

export async function createChore(req: Request, res: Response): Promise<void> {
  const { title, description, child_id, frequency, reward_points, due_date } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: 'Chore title is required' }); return; }

  const { rows } = await pool.query(
    `INSERT INTO chores
       (parent_user_id, child_id, title, description, frequency, reward_points, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      req.user!.userId,
      child_id || null,
      title.trim(),
      description || null,
      frequency   || 'once',
      parseInt(reward_points, 10) || 0,
      due_date    || null,
    ],
  );
  res.status(201).json(rows[0]);
}

export async function updateChore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, child_id, frequency, reward_points, due_date, status } = req.body;

  const { rows } = await pool.query(
    `UPDATE chores
     SET title         = COALESCE($1, title),
         description   = COALESCE($2, description),
         child_id      = COALESCE($3, child_id),
         frequency     = COALESCE($4, frequency),
         reward_points = COALESCE($5, reward_points),
         due_date      = COALESCE($6, due_date),
         status        = COALESCE($7, status)
     WHERE id = $8 AND parent_user_id = $9
     RETURNING *`,
    [
      title       ?? null,
      description ?? null,
      child_id    ?? null,
      frequency   ?? null,
      reward_points != null ? parseInt(reward_points, 10) : null,
      due_date    ?? null,
      status      ?? null,
      id,
      req.user!.userId,
    ],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Chore not found' }); return; }
  res.json(rows[0]);
}

// Soft-cancel: chores are immutable so we only update status
export async function cancelChore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rowCount } = await pool.query(
    `UPDATE chores SET status = 'cancelled'
     WHERE id = $1 AND parent_user_id = $2 AND status != 'cancelled'`,
    [id, req.user!.userId],
  );
  if (!rowCount) { res.status(404).json({ error: 'Chore not found or already cancelled' }); return; }
  res.status(204).send();
}

// POST /api/chores/:id/complete
export async function completeChore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { child_id, notes } = req.body;
  if (!child_id) { res.status(400).json({ error: 'child_id is required' }); return; }

  const { rows: choreRows } = await pool.query(
    'SELECT * FROM chores WHERE id = $1 AND parent_user_id = $2',
    [id, req.user!.userId],
  );
  if (choreRows.length === 0) { res.status(404).json({ error: 'Chore not found' }); return; }
  const chore = choreRows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Append-only completion record
    const { rows: [completion] } = await client.query(
      `INSERT INTO chore_completions
         (chore_id, child_id, completed_by_user_id, points_awarded, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, child_id, req.user!.userId, chore.reward_points, notes || null],
    );

    // Once-off chores are marked completed
    if (chore.frequency === 'once') {
      await client.query(`UPDATE chores SET status = 'completed' WHERE id = $1`, [id]);
    }

    // Compute running balance and write ledger entry
    if (chore.reward_points > 0) {
      const { rows: [bal] } = await client.query(
        `SELECT COALESCE(SUM(delta), 0)::int AS balance FROM point_ledger WHERE child_id = $1`,
        [child_id],
      );
      const balanceAfter = (bal.balance as number) + chore.reward_points;
      await client.query(
        `INSERT INTO point_ledger
           (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
         VALUES ($1, $2, $3, 'chore_completion', $4, $5, $6)`,
        [child_id, chore.reward_points, `Completed: ${chore.title}`, completion.id, balanceAfter, req.user!.userId],
      );
    }

    await client.query('COMMIT');
    res.status(201).json(completion);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getChoreCompletions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT cc.*, ch.name AS child_name
     FROM chore_completions cc
     JOIN chores c ON c.id = cc.chore_id
     LEFT JOIN children ch ON ch.id = cc.child_id
     WHERE cc.chore_id = $1 AND c.parent_user_id = $2
     ORDER BY cc.completed_at DESC`,
    [id, req.user!.userId],
  );
  res.json(rows);
}

// ─── Points ────────────────────────────────────────────────────────────────────

export async function getChildPoints(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(delta), 0)::int                                         AS total_points,
       (SELECT COUNT(*)::int FROM chore_completions WHERE child_id = $1)    AS completion_count
     FROM point_ledger WHERE child_id = $1`,
    [childId],
  );
  res.json(rows[0]);
}

// ─── Rewards ───────────────────────────────────────────────────────────────────

export async function listRewards(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    `SELECT * FROM rewards WHERE parent_user_id = $1 AND is_active = true ORDER BY point_cost`,
    [req.user!.userId],
  );
  res.json(rows);
}

export async function createReward(req: Request, res: Response): Promise<void> {
  const { title, description, point_cost, max_redemptions } = req.body;
  if (!title?.trim())             { res.status(400).json({ error: 'Reward title is required' }); return; }
  if (!point_cost || point_cost < 1) { res.status(400).json({ error: 'point_cost must be >= 1' }); return; }

  const { rows } = await pool.query(
    `INSERT INTO rewards (parent_user_id, title, description, point_cost, max_redemptions)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user!.userId, title.trim(), description || null, parseInt(point_cost, 10), max_redemptions || null],
  );
  res.status(201).json(rows[0]);
}

// POST /api/rewards/:id/redeem
export async function redeemReward(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { child_id } = req.body;
  if (!child_id) { res.status(400).json({ error: 'child_id is required' }); return; }

  const { rows: rewardRows } = await pool.query(
    'SELECT * FROM rewards WHERE id = $1 AND parent_user_id = $2 AND is_active = true',
    [id, req.user!.userId],
  );
  if (rewardRows.length === 0) { res.status(404).json({ error: 'Reward not found' }); return; }
  const reward = rewardRows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [bal] } = await client.query(
      `SELECT COALESCE(SUM(delta), 0)::int AS balance FROM point_ledger WHERE child_id = $1`,
      [child_id],
    );
    if ((bal.balance as number) < reward.point_cost) {
      res.status(422).json({ error: 'Insufficient points' });
      await client.query('ROLLBACK');
      return;
    }

    const { rows: [redemption] } = await client.query(
      `INSERT INTO reward_redemptions (reward_id, child_id, approved_by_user_id, points_spent)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, child_id, req.user!.userId, reward.point_cost],
    );

    const balanceAfter = (bal.balance as number) - reward.point_cost;
    await client.query(
      `INSERT INTO point_ledger
         (child_id, delta, reason, reference_type, reference_id, balance_after, created_by_user_id)
       VALUES ($1, $2, $3, 'reward_redemption', $4, $5, $6)`,
      [child_id, -reward.point_cost, `Redeemed: ${reward.title}`, redemption.id, balanceAfter, req.user!.userId],
    );

    await client.query('COMMIT');
    res.status(201).json({ redemption, balance_after: balanceAfter });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
