import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listChildren, createChild, updateChild,
  listChores, createChore, updateChore, cancelChore,
  completeChore, getChoreCompletions, getChildPoints,
  listRewards, createReward, redeemReward,
} from '../handlers/choreHandler';

export const choreRouter = Router();
choreRouter.use(requireAuth);

// Children
choreRouter.get('/children',        listChildren);
choreRouter.post('/children',       createChild);
choreRouter.put('/children/:id',    updateChild);
choreRouter.get('/children/:childId/points', getChildPoints);

// Rewards
choreRouter.get('/rewards',         listRewards);
choreRouter.post('/rewards',        createReward);
choreRouter.post('/rewards/:id/redeem', redeemReward);

// Chores
choreRouter.get('/',                listChores);
choreRouter.post('/',               createChore);
choreRouter.put('/:id',             updateChore);
choreRouter.delete('/:id',          cancelChore);
choreRouter.post('/:id/complete',   completeChore);
choreRouter.get('/:id/completions', getChoreCompletions);
