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
      // If filtering by child, verify the child belongs to this parent (or user is the child)
      const userIsChild = req.user.roles?.includes('child');
      if (!userIsChild) {
        // Parent requesting chores for a specific child
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
      // List all chores for this parent
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

    const { title, description, frequency, rewardPoints, dueDate, childId } = req.body;

    // Validation
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

    // If childId is provided, verify it belongs to this parent
    if (childId) {
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
        childId: childId || undefined,
        title: title.trim(),
        description: description && typeof description === 'string' ? description.trim() : undefined,
        frequency: frequency as 'daily' | 'weekly' | 'monthly' | 'once',
        rewardPoints: points,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
    });

    res.status(201).json(chore);
  } catch (err) {
    console.error('[Chores] Create error:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
}
