import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireParent, requireChild } from '../middleware/rbac';
import { requirePinSession } from '../middleware/pinMiddleware';
import {
  listRedemptions,
  requestRedemption,
  approveRedemption,
  fulfillRedemption,
  cancelRedemption,
  listRewards,
  createReward,
} from '../handlers/redemptionHandler';

export const redemptionRouter = Router();

redemptionRouter.use(requireAuth);

// Rewards catalog
redemptionRouter.get('/rewards', requireChild(), listRewards);
redemptionRouter.post('/rewards', requireParent(), createReward);

// Redemption requests
redemptionRouter.get('/', requireChild(), listRedemptions);
redemptionRouter.post('/', requireChild(), requestRedemption);
redemptionRouter.patch('/:id/approve', requireParent(), requirePinSession, approveRedemption);
redemptionRouter.patch('/:id/fulfill', requireParent(), fulfillRedemption);
redemptionRouter.patch('/:id/cancel', requireChild(), cancelRedemption);
