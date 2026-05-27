import { Router } from 'express';
import { authRouter } from './authRoutes';
import { recipeRouter } from './recipeRoutes';
import { menuRouter } from './menuRoutes';
import { pantryRouter } from './pantryRoutes';
import { complianceRouter } from './complianceRoutes';
import { krogerRouter } from './krogerRoutes';
import { childrenRouter } from './childrenRoutes';
import { choreRouter } from './choreRoutes';
import { redemptionRouter } from './redemptionRoutes';
import { pinRouter } from './pinRoutes';
import { calendarRouter } from './calendarRoutes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/recipes', recipeRouter);
apiRouter.use('/menu', menuRouter);
apiRouter.use('/pantry', pantryRouter);
apiRouter.use('/compliance', complianceRouter);
apiRouter.use('/kroger', krogerRouter);
apiRouter.use('/children', childrenRouter);
apiRouter.use('/chores', choreRouter);
apiRouter.use('/redemptions', redemptionRouter);
apiRouter.use('/pin', pinRouter);
apiRouter.use('/calendar', calendarRouter);

