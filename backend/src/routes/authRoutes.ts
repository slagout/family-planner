import { Router } from 'express';
import { register, login, getMe } from '../handlers/authHandler';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, getMe);
