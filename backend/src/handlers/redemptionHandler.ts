import { Request, Response } from 'express';
import { redemptionRequestRepo } from '../repositories/redemptionRequestRepo';
import { rewardRepo } from '../repositories/rewardRepo';
import { getPool } from '../db';

export async function requestRedemption(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { childId, rewardId } = req.body;
    if (!childId || !rewardId) {
      res.status(400).json({ error: 'childId and rewardId are required' });
      return;
    }

    const redemption = await redemptionRequestRepo.requestRedemption({
      childId,
      rewardId,
      requestedByUserId: req.user.userId,
    });
    res.status(201).json(redemption);
  } catch (err: any) {
    console.error('[Redemption] Request error:', err);
    const status = err.message?.includes('not found') ? 404 :
                   err.message?.includes('Insufficient') ? 422 : 500;
    res.status(status).json({ error: err.message || 'Failed to request redemption' });
  }
}

export async function approveRedemption(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const redemption = await redemptionRequestRepo.approveRedemption(
      req.params.id,
      req.user.userId
    );
    res.json(redemption);
  } catch (err: any) {
    console.error('[Redemption] Approve error:', err);
    const status = err.message?.includes('not found') ? 404 :
                   err.message?.includes('Cannot approve') ? 409 :
                   err.message?.includes('Insufficient') ? 422 : 500;
    res.status(status).json({ error: err.message || 'Failed to approve redemption' });
  }
}

export async function fulfillRedemption(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const redemption = await redemptionRequestRepo.fulfillRedemption(req.params.id, req.user.userId);
    res.json(redemption);
  } catch (err: any) {
    console.error('[Redemption] Fulfill error:', err);
    const status = err.message?.includes('not found') ? 404 :
                   err.message?.includes('Cannot fulfill') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to fulfill redemption' });
  }
}

export async function cancelRedemption(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { reason } = req.body;
    const redemption = await redemptionRequestRepo.cancelRedemption({
      id: req.params.id,
      cancelledByUserId: req.user.userId,
      reason: reason || undefined,
    });
    res.json(redemption);
  } catch (err: any) {
    console.error('[Redemption] Cancel error:', err);
    const status = err.message?.includes('not found') ? 404 :
                   err.message?.includes('Cannot cancel') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to cancel redemption' });
  }
}

export async function listRedemptions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { childId } = req.query;
    let redemptions;

    if (childId && typeof childId === 'string') {
      redemptions = await redemptionRequestRepo.findByChild(childId);
    } else {
      redemptions = await redemptionRequestRepo.findPendingByParent(req.user.userId);
    }

    res.json(redemptions);
  } catch (err) {
    console.error('[Redemption] List error:', err);
    res.status(500).json({ error: 'Failed to list redemptions' });
  }
}

export async function listRewards(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    // If requesting as child, need parent's user ID
    const { parentUserId } = req.query;
    const pid = (parentUserId as string) || req.user.userId;

    const rewards = await rewardRepo.findByParent(pid);
    res.json(rewards);
  } catch (err) {
    console.error('[Rewards] List error:', err);
    res.status(500).json({ error: 'Failed to list rewards' });
  }
}

export async function createReward(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { title, description, pointCost, maxRedemptions } = req.body;
    if (!title || !pointCost) {
      res.status(400).json({ error: 'title and pointCost are required' });
      return;
    }

    const reward = await rewardRepo.create({
      parentUserId: req.user.userId,
      title,
      description,
      pointCost: Number(pointCost),
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
    });
    res.status(201).json(reward);
  } catch (err) {
    console.error('[Rewards] Create error:', err);
    res.status(500).json({ error: 'Failed to create reward' });
  }
}
