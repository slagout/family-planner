import { Response, Request } from 'express';
import { choreRepo } from '../repositories/choreRepo';
import { getPool, withTransaction } from '../db';

// ---------------------------------------------------------------------------
// Chore CRUD
// ---------------------------------------------------------------------------

export async function listChores(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { childId, child_id, status, frequency } = req.query as Record<string, string>;
    const targetChildId = childId || child_id;
    let chores;

    if (targetChildId) {
      const userIsChild = req.user.roles?.includes('child');
      if (!userIsChild) {
        const { rows } = await getPool().query(
          `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2`,
          [targetChildId, req.user.userId]
        );
        if (rows.length === 0) {
          res.status(403).json({ error: "Not authorized to view this child's chores" });
          return;
        }
      }
      chores = await choreRepo.findByChild(targetChildId);
    } else {
      chores = await choreRepo.findByParent(req.user.userId);
    }

    // Apply optional in-memory filters when using choreRepo path
    if (status)    chores = chores.filter((c: any) => c.status    === status);
    if (frequency) chores = chores.filter((c: any) => c.frequency === frequency);

    res.json(chores);
  } catch (err) {
    console.error('[Chores] List error:', err);
    res.status(500).json({ error: 'Failed to list chores' });
  }
}

export async function createChore(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { title, description, frequency, rewardPoints, reward_points, dueDate, due_date,
            childId, child_id, assignedToGroup, splitType, groupChildIds, groupWeights } = req.body;

    const titleVal = title?.trim();
    if (!titleVal) { res.status(400).json({ error: 'Chore title is required' }); return; }

    const freqVal = frequency || 'once';
    if (!['daily', 'weekly', 'monthly', 'once'].includes(freqVal)) {
      res.status(400).json({ error: 'Frequency must be: daily, weekly, monthly, or once' }); return;
    }

    const points = Number(rewardPoints ?? reward_points ?? 10);
    if (isNaN(points) || points < 0) { res.status(400).json({ error: 'Reward points must be >= 0' }); return; }

    const isGroup = assignedToGroup === true;
    const cid = childId || child_id;

    if (isGroup) {
      if (!Array.isArray(groupChildIds) || groupChildIds.length < 2) {
        res.status(400).json({ error: 'Group chores require at least 2 children in groupChildIds' }); return;
      }
      for (const id of groupChildIds) {
        const { rows } = await getPool().query(
          `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2 AND is_active = true`,
          [id, req.user.userId]
        );
        if (rows.length === 0) {
          res.status(400).json({ error: `Child ${id} not found or does not belong to this parent` }); return;
        }
      }
    } else if (cid) {
      const { rows } = await getPool().query(
        `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2 AND is_active = true`,
        [cid, req.user.userId]
      );
      if (rows.length === 0) { res.status(400).json({ error: 'Child not found or does not belong to this parent' }); return; }
    }

    const chore = await withTransaction(async (client) => choreRepo.create(client, {
      parentUserId: req.user!.userId,
      childId: isGroup ? undefined : (cid || undefined),
      title: titleVal,
      description: description?.trim() || undefined,
      frequency: freqVal as 'daily' | 'weekly' | 'monthly' | 'once',
      rewardPoints: points,
      dueDate: (dueDate || due_date) ? new Date(dueDate || due_date) : undefined,
      assignedToGroup: isGroup,
      splitType: splitType ?? 'equal',
      groupChildIds: isGroup ? groupChildIds : undefined,
      groupWeights: isGroup ? groupWeights : undefined,
    }));

    res.status(201).json(chore);
  } catch (err) {
    console.error('[Chores] Create error:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
}

export async function updateChore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { title, description, child_id, frequency, reward_points, due_date, status } = req.body;
  const pool = getPool();

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
      title ?? null, description ?? null, child_id ?? null, frequency ?? null,
      reward_points != null ? parseInt(reward_points, 10) : null,
      due_date ?? null, status ?? null, id, req.user!.userId,
    ],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Chore not found' }); return; }
  res.json(rows[0]);
}

export async function cancelChore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rowCount } = await getPool().query(
    `UPDATE chores SET status = 'cancelled'
     WHERE id = $1 AND parent_user_id = $2 AND status != 'cancelled'`,
    [id, req.user!.userId],
  );
  if (!rowCount) { res.status(404).json({ error: 'Chore not found or already cancelled' }); return; }
  res.status(204).send();
}

export async function completeChore(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { choreId, id } = req.params;
    const { childId, child_id, notes } = req.body;
    const cid = choreId || id;
    const kid = childId || child_id;
    if (!kid) { res.status(400).json({ error: 'childId is required' }); return; }

    const chore = await choreRepo.findById(cid);
    if (!chore) { res.status(404).json({ error: 'Chore not found' }); return; }

    if (chore.assignedToGroup) {
      const result = await choreRepo.completeGroupChore({ choreId: cid, childId: kid, completedByUserId: req.user.userId, notes: notes || undefined });
      res.json(result);
    } else {
      const result = await choreRepo.completeChore({ choreId: cid, childId: kid, completedByUserId: req.user.userId, notes: notes || undefined });
      res.json(result);
    }
  } catch (err: any) {
    console.error('[Chores] Complete error:', err);
    const status = err.message?.includes('not found') ? 404 : err.message?.includes('already completed') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to complete chore' });
  }
}

export async function getChoreCompletions(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rows } = await getPool().query(
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

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------

export async function getChildPoints(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;
  const { rows } = await getPool().query(
    `SELECT
       COALESCE(SUM(delta), 0)::int                                         AS total_points,
       (SELECT COUNT(*)::int FROM chore_completions WHERE child_id = $1)    AS completion_count
     FROM point_ledger WHERE child_id = $1`,
    [childId],
  );
  res.json(rows[0]);
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export async function listRewards(req: Request, res: Response): Promise<void> {
  const { rows } = await getPool().query(
    `SELECT * FROM rewards WHERE parent_user_id = $1 AND is_active = true ORDER BY point_cost`,
    [req.user!.userId],
  );
  res.json(rows);
}

export async function createReward(req: Request, res: Response): Promise<void> {
  const { title, description, point_cost, max_redemptions } = req.body;
  if (!title?.trim())                { res.status(400).json({ error: 'Reward title is required' }); return; }
  if (!point_cost || point_cost < 1) { res.status(400).json({ error: 'point_cost must be >= 1' }); return; }

  const { rows } = await getPool().query(
    `INSERT INTO rewards (parent_user_id, title, description, point_cost, max_redemptions)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user!.userId, title.trim(), description || null, parseInt(point_cost, 10), max_redemptions || null],
  );
  res.status(201).json(rows[0]);
}

export async function redeemReward(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { child_id } = req.body;
  if (!child_id) { res.status(400).json({ error: 'child_id is required' }); return; }

  const { rows: rewardRows } = await getPool().query(
    'SELECT * FROM rewards WHERE id = $1 AND parent_user_id = $2 AND is_active = true',
    [id, req.user!.userId],
  );
  if (rewardRows.length === 0) { res.status(404).json({ error: 'Reward not found' }); return; }
  const reward = rewardRows[0];

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: [bal] } = await client.query(
      `SELECT COALESCE(SUM(delta), 0)::int AS balance FROM point_ledger WHERE child_id = $1`,
      [child_id],
    );
    if ((bal.balance as number) < reward.point_cost) {
      await client.query('ROLLBACK');
      res.status(422).json({ error: 'Insufficient points' });
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
