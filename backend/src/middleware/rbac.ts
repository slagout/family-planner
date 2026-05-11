import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './keycloak-auth';

export type AppRole = 'parent' | 'child' | 'admin';

export function requireRole(...roles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        actual: req.user.roles,
      });
      return;
    }
    next();
  };
}

export function requireParent() {
  return requireRole('parent', 'admin');
}

export function requireChild() {
  return requireRole('child', 'parent', 'admin');
}
