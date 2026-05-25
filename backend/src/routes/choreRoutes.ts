import { Router } from 'express';
import { listChores, createChore } from '../handlers/choreHandler';
import { requireAuth } from '../middleware/auth';
import { requireParent, requireChild } from '../middleware/rbac';

export const choreRouter = Router();

choreRouter.use(requireAuth);

choreRouter.get('/', requireChild(), listChores);
choreRouter.post('/', requireParent(), createChore);
