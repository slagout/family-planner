import { Router } from 'express';
import { authRouter }       from './authRoutes';
import { recipeRouter }     from './recipeRoutes';
import { menuRouter }       from './menuRoutes';
import { pantryRouter }     from './pantryRoutes';
import { complianceRouter } from './complianceRoutes';
import { krogerRouter }     from './krogerRoutes';
import { haRouter }         from './haRoutes';

export const apiRouter = Router();

apiRouter.use('/auth',       authRouter);
apiRouter.use('/recipes',    recipeRouter);
apiRouter.use('/menu',       menuRouter);
apiRouter.use('/pantry',     pantryRouter);
apiRouter.use('/compliance', complianceRouter);
apiRouter.use('/kroger',     krogerRouter);
apiRouter.use('/ha',         haRouter);   // Home Assistant REST integration
