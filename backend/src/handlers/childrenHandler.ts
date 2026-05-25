import { Response, Request } from 'express';
import { childRepo } from '../repositories/childRepo';
import { getPool } from '../db';

export async function listChildren(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const children = await childRepo.findByParent(req.user.userId);

    const enrichedChildren = await Promise.all(
      children.map(async (child) => {
        const balance = await childRepo.getPointBalance(child.id);
        const { rows: choreRows } = await getPool().query(
          `SELECT COUNT(*) as count FROM chores WHERE child_id = $1 AND status IN ('pending', 'in_progress')`,
          [child.id]
        );
        const assignedChores = parseInt(choreRows[0].count, 10);

        return {
          id: child.id,
          name: child.name,
          age: child.dateOfBirth
            ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null,
          currentStars: balance,
          assignedChores,
          activitySchedule: [], // TODO: implement activity schedule from completions
        };
      })
    );

    res.json(enrichedChildren);
  } catch (err) {
    console.error('[Children] List error:', err);
    res.status(500).json({ error: 'Failed to list children' });
  }
}

export async function createChild(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name, dateOfBirth, allergies, dietaryRestrictions } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Child name is required and must be a non-empty string' });
      return;
    }

    const child = await childRepo.create({
      parentUserId: req.user.userId,
      name: name.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      allergies: Array.isArray(allergies) ? allergies : [],
      dietaryRestrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
    });

    res.status(201).json({
      id: child.id,
      name: child.name,
      age: child.dateOfBirth
        ? Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      currentStars: 0,
      assignedChores: 0,
      activitySchedule: [],
    });
  } catch (err) {
    console.error('[Children] Create error:', err);
    res.status(500).json({ error: 'Failed to create child' });
  }
}
