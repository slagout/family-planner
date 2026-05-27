import { Response, Request } from 'express';
import { choreRepo } from '../repositories/choreRepo';
import { getPool, withTransaction } from '../db';

export async function listChores(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { childId } = req.query;
    let chores;

    if (childId && typeof childId === 'string') {
      const userIsChild = req.user.roles?.includes('child');
      if (!userIsChild) {
        const { rows: childRows } = await getPool().query(
          `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2`,
          [childId, req.user.userId]
        );
        if (childRows.length === 0) {
          res.status(403).json({ error: 'Not authorized to view this child\'s chores' });
          return;
        }
      }
      chores = await choreRepo.findByChild(childId);
    } else {
      chores = await choreRepo.findByParent(req.user.userId);
    }

    res.json(chores);
  } catch (err) {
    console.error('[Chores] List error:', err);
    res.status(500).json({ error: 'Failed to list chores' });
  }
}

export async function createChore(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { title, description, frequency, rewardPoints, dueDate, childId,
            assignedToGroup, splitType, groupChildIds, groupWeights } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Chore title is required and must be a non-empty string' });
      return;
    }

    if (!frequency || !['daily', 'weekly', 'monthly', 'once'].includes(frequency)) {
      res.status(400).json({
        error: 'Frequency is required and must be one of: daily, weekly, monthly, once',
      });
      return;
    }

    const points = rewardPoints !== undefined ? Number(rewardPoints) : 10;
    if (isNaN(points) || points < 0) {
      res.status(400).json({ error: 'Reward points must be a non-negative number' });
      return;
    }

    const isGroup = assignedToGroup === true;

    if (isGroup) {
      if (!Array.isArray(groupChildIds) || groupChildIds.length < 2) {
        res.status(400).json({ error: 'Group chores require at least 2 children in groupChildIds' });
        return;
      }
      // Verify all children belong to this parent
      for (const cid of groupChildIds) {
        const { rows } = await getPool().query(
          `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2 AND is_active = true`,
          [cid, req.user.userId]
        );
        if (rows.length === 0) {
          res.status(400).json({ error: `Child ${cid} not found or does not belong to this parent` });
          return;
        }
      }
    } else if (childId) {
      const { rows: childRows } = await getPool().query(
        `SELECT id FROM children WHERE id = $1 AND parent_user_id = $2 AND is_active = true`,
        [childId, req.user.userId]
      );
      if (childRows.length === 0) {
        res.status(400).json({ error: 'Child not found or does not belong to this parent' });
        return;
      }
    }

    const chore = await withTransaction(async (client) => {
      return choreRepo.create(client, {
        parentUserId: req.user!.userId,
        childId: isGroup ? undefined : (childId || undefined),
        title: title.trim(),
        description: description && typeof description === 'string' ? description.trim() : undefined,
        frequency: frequency as 'daily' | 'weekly' | 'monthly' | 'once',
        rewardPoints: points,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToGroup: isGroup,
        splitType: splitType ?? 'equal',
        groupChildIds: isGroup ? groupChildIds : undefined,
        groupWeights: isGroup ? groupWeights : undefined,
      });
    });

    res.status(201).json(chore);
  } catch (err) {
    console.error('[Chores] Create error:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
}

export async function completeChore(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { choreId } = req.params;
    const { childId, notes } = req.body;

    if (!childId) {
      res.status(400).json({ error: 'childId is required' });
      return;
    }

    const chore = await choreRepo.findById(choreId);
    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }

    if (chore.assignedToGroup) {
      const result = await choreRepo.completeGroupChore({
        choreId,
        childId,
        completedByUserId: req.user.userId,
        notes: notes || undefined,
      });
      res.json(result);
    } else {
      const result = await choreRepo.completeChore({
        choreId,
        childId,
        completedByUserId: req.user.userId,
        notes: notes || undefined,
      });
      res.json(result);
    }
  } catch (err: any) {
    console.error('[Chores] Complete error:', err);
    const status = err.message?.includes('not found') ? 404 :
                   err.message?.includes('already completed') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to complete chore' });
  }
}

