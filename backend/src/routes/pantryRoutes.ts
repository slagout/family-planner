import { Router } from 'express';
import { listPantry, upsertPantryItem, updatePantryItem, deletePantryItem } from '../handlers/pantryHandler';
import { requireAuth } from '../middleware/auth';

export const pantryRouter = Router();

pantryRouter.use(requireAuth);
pantryRouter.get('/', listPantry);
pantryRouter.post('/', upsertPantryItem);
pantryRouter.put('/:id', updatePantryItem);
pantryRouter.delete('/:id', deletePantryItem);
