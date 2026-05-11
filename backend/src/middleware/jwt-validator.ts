import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

export function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is not set. ' +
      'Please set a strong JWT secret (minimum 32 characters).'
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET is too weak (${secret.length} characters). ` +
      'Please use a secret of at least 32 characters.'
    );
  }

  if (
    secret === 'changeme_to_random_32char_string' ||
    secret === 'dev' ||
    secret === 'test'
  ) {
    console.warn('⚠️  WARNING: Using default/weak JWT_SECRET. This is insecure in production!');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production must use a secure JWT_SECRET');
    }
  }
}

export function verifyToken(token: string): AuthPayload {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export function signToken(payload: AuthPayload, expiresIn: string = '24h'): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: expiresIn as any,
    algorithm: 'HS256',
    audience: 'family-planner',
  });
}

export function createRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '30d' as any,
    algorithm: 'HS256',
    audience: 'family-planner-refresh',
  });
}
