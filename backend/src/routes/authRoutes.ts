import { Router } from 'express';
import { register, login, refreshToken, getMe } from '../handlers/authHandler';
import { requireAuth } from '../middleware/auth';
import { authLimiter, registrationLimiter } from '../middleware/rate-limiter';

export const authRouter = Router();

authRouter.post('/register', registrationLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', refreshToken);
authRouter.get('/me', requireAuth, getMe);
