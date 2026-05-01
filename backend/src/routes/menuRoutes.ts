import { Router } from 'express';
import { planWeek, getCurrentMenu, deleteMenu } from '../handlers/menuPlanner';
import { requireAuth } from '../middleware/auth';

export const menuRouter = Router();

menuRouter.use(requireAuth);
menuRouter.post('/plan', planWeek);
menuRouter.get('/current', getCurrentMenu);
menuRouter.delete('/:id', deleteMenu);
