import { Router, Request, Response, NextFunction } from 'express';
import { listChildren, createChild } from '../handlers/childrenHandler';
import { requireAuth } from '../middleware/auth';
import { requireParent } from '../middleware/rbac';
import { requirePinSession } from '../middleware/pinMiddleware';

export const childrenRouter = Router();

const ensureUserRoles = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user as { roles?: unknown } | undefined;
  if (user && !Array.isArray(user.roles)) {
    user.roles = [];
  }
  next();
};

childrenRouter.use(requireAuth);
childrenRouter.use(ensureUserRoles);

childrenRouter.get('/', requireParent(), listChildren);
childrenRouter.post('/', requireParent(), requirePinSession, createChild);
