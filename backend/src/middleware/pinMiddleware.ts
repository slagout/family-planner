import { Request, Response, NextFunction } from 'express';
import { getPool } from '../db';

/**
 * Middleware that requires a valid parental PIN session.
 * The client must include `X-PIN-Session: <token>` in the request header.
 * Tokens are issued by POST /api/pin/verify and expire after 30 minutes.
 *
 * Apply AFTER requireAuth — expects req.user to be populated.
 */
export async function requirePinSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers['x-pin-session'];

  if (!token || typeof token !== 'string') {
    res.status(403).json({
      error: 'Parental PIN session required',
      code: 'PIN_SESSION_MISSING',
    });
    return;
  }

  try {
    // Clean up expired sessions as a side effect (lightweight housekeeping)
    await getPool().query(`DELETE FROM pin_sessions WHERE expires_at < now()`);

    const { rows } = await getPool().query(
      `SELECT id, user_id, expires_at
       FROM pin_sessions
       WHERE token = $1 AND expires_at > now()`,
      [token]
    );

    if (rows.length === 0) {
      res.status(403).json({
        error: 'PIN session expired or invalid — please re-authenticate',
        code: 'PIN_SESSION_INVALID',
      });
      return;
    }

    // Optionally validate that the session belongs to the authenticated user
    if (req.user && rows[0].user_id !== req.user.userId) {
      res.status(403).json({
        error: 'PIN session does not match current user',
        code: 'PIN_SESSION_MISMATCH',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[PIN] Session validation error:', err);
    res.status(500).json({ error: 'PIN session validation failed' });
  }
}
