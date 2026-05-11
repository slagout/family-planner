import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const keyGenerator = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    return req.path === '/api/health';
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true, // Don't count successful requests
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour per user
  keyGenerator: (req) => {
    return req.user?.userId || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'API rate limit exceeded. Please try again later.' },
});

export const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 registrations per 24 hours per IP
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again tomorrow.' },
});
