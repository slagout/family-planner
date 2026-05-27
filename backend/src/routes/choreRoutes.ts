import { Router } from 'express';
import { listChores, createChore, completeChore } from '../handlers/choreHandler';
import { requireAuth } from '../middleware/auth';
import { requireParent, requireChild } from '../middleware/rbac';
import { requirePinSession } from '../middleware/pinMiddleware';

export const choreRouter = Router();

choreRouter.use(requireAuth);

choreRouter.get('/', requireChild(), listChores);
choreRouter.post('/', requireParent(), requirePinSession, createChore);
choreRouter.post('/:choreId/complete', requireChild(), completeChore);
choreRouter.patch('/:choreId', requireParent(), requirePinSession, createChore);

