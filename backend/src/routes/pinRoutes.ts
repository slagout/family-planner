import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { setPin, verifyPin, lockPinSession, pinStatus } from '../handlers/pinHandler';

export const pinRouter = Router();

pinRouter.use(requireAuth);

pinRouter.get('/status', pinStatus);
pinRouter.post('/set', setPin);
pinRouter.post('/verify', verifyPin);
pinRouter.delete('/session', lockPinSession);
