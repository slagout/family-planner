import { Request, Response, NextFunction } from 'express';

export type AppRole = 'parent' | 'child' | 'admin';

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const userRoles: string[] = req.user.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        actual: userRoles,
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
