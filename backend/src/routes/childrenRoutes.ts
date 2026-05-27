import { Router } from 'express';
import { listChildren, createChild } from '../handlers/childrenHandler';
import { requireAuth } from '../middleware/auth';
import { requireParent } from '../middleware/rbac';

export const childrenRouter = Router();

childrenRouter.use(requireAuth);

childrenRouter.get('/', requireParent(), listChildren);
childrenRouter.post('/', requireParent(), createChild);
