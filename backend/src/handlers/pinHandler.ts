import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getPool } from '../db';

const PIN_SESSION_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

/** POST /api/pin/set — Parent sets or changes their 4-digit PIN. */
export async function setPin(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      res.status(400).json({ error: 'PIN must be exactly 4 digits' });
      return;
    }

    const hash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await getPool().query(
      `UPDATE users SET parental_pin_hash = $1 WHERE id = $2`,
      [hash, req.user.userId]
    );

    // Invalidate existing PIN sessions
    await getPool().query(`DELETE FROM pin_sessions WHERE user_id = $1`, [req.user.userId]);

    res.json({ message: 'PIN updated successfully' });
  } catch (err) {
    console.error('[PIN] Set error:', err);
    res.status(500).json({ error: 'Failed to set PIN' });
  }
}

/** POST /api/pin/verify — Validate PIN and return a short-lived session token. */
export async function verifyPin(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      res.status(400).json({ error: 'PIN is required' });
      return;
    }

    const { rows } = await getPool().query(
      `SELECT parental_pin_hash FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (rows.length === 0 || !rows[0].parental_pin_hash) {
      res.status(400).json({ error: 'No PIN configured. Please set a PIN first.' });
      return;
    }

    const valid = await bcrypt.compare(pin, rows[0].parental_pin_hash);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect PIN', code: 'PIN_INCORRECT' });
      return;
    }

    // Generate a cryptographically random token
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + PIN_SESSION_DURATION_MINUTES * 60 * 1000);

    await getPool().query(
      `INSERT INTO pin_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [req.user.userId, token, expiresAt]
    );

    res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      durationMinutes: PIN_SESSION_DURATION_MINUTES,
    });
  } catch (err) {
    console.error('[PIN] Verify error:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
}

/** DELETE /api/pin/session — Manually invalidate a PIN session (Lock). */
export async function lockPinSession(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers['x-pin-session'];
    if (token && typeof token === 'string') {
      await getPool().query(`DELETE FROM pin_sessions WHERE token = $1`, [token]);
    }
    res.json({ message: 'PIN session locked' });
  } catch (err) {
    console.error('[PIN] Lock error:', err);
    res.status(500).json({ error: 'Failed to lock PIN session' });
  }
}

/** GET /api/pin/status — Check if the current user has a PIN configured. */
export async function pinStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { rows } = await getPool().query(
      `SELECT parental_pin_hash IS NOT NULL AS has_pin FROM users WHERE id = $1`,
      [req.user.userId]
    );
    res.json({ hasPin: rows[0]?.has_pin ?? false });
  } catch (err) {
    console.error('[PIN] Status error:', err);
    res.status(500).json({ error: 'Failed to check PIN status' });
  }
}
