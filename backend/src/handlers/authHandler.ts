import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { AuthPayload } from '../types';
import { signToken, createRefreshToken, verifyToken } from '../middleware/jwt-validator';

const SALT_ROUNDS = 12;

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, displayName } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (displayName && (typeof displayName !== 'string' || displayName.length > 50)) {
    res.status(400).json({ error: 'Display name must be 50 characters or less' });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [email.toLowerCase(), passwordHash, displayName || null]
    );
    const user = rows[0];
    const payload: AuthPayload = { userId: user.id, id: user.id, email: user.email, roles: ['parent'] };
    const token = signToken(payload);
    const refreshToken = createRefreshToken(payload);

    res.status(201).json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const payload: AuthPayload = { userId: user.id, id: user.id, email: user.email, roles: ['parent'] };
    const token = signToken(payload);
    const refreshToken = createRefreshToken(payload);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const payload = verifyToken(token) as AuthPayload;
    const newToken = signToken(payload);
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const u = rows[0];
    res.json({ id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
}
