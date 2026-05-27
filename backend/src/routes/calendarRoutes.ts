import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireChild } from '../middleware/rbac';
import { getCalendar } from '../handlers/calendarHandler';

export const calendarRouter = Router();

calendarRouter.use(requireAuth);

calendarRouter.get('/:childId', requireChild(), getCalendar);
