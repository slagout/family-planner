import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireParent, requireChild } from '../middleware/rbac';
import { requirePinSession } from '../middleware/pinMiddleware';
import {
  listChores, createChore, updateChore, cancelChore,
  completeChore, getChoreCompletions, getChildPoints,
  listRewards, createReward, redeemReward,
} from '../handlers/choreHandler';

export const choreRouter = Router();
choreRouter.use(requireAuth);

// Points
choreRouter.get('/children/:childId/points', requireParent(), getChildPoints);

// Rewards
choreRouter.get('/rewards',             requireParent(), listRewards);
choreRouter.post('/rewards',            requireParent(), requirePinSession, createReward);
choreRouter.post('/rewards/:id/redeem', requireParent(), requirePinSession, redeemReward);

// Chores
choreRouter.get('/',                requireChild(), listChores);
choreRouter.post('/',               requireParent(), requirePinSession, createChore);
choreRouter.put('/:id',             requireParent(), requirePinSession, updateChore);
choreRouter.delete('/:id',          requireParent(), requirePinSession, cancelChore);
choreRouter.post('/:id/complete',   requireChild(), completeChore);
choreRouter.post('/:choreId/complete', requireChild(), completeChore);
choreRouter.get('/:id/completions', requireParent(), getChoreCompletions);
