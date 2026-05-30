import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt-validator';
import { AuthPayload } from '../types';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    // Ensure both `userId` and `id` are set for cross-middleware compatibility
    req.user = { ...payload, id: payload.id ?? payload.userId, roles: payload.roles ?? [] };
    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Invalid or expired token',
    });
  }
}
