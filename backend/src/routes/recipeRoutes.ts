import { Router } from 'express';
import { listRecipes, getRecipeById, createRecipe } from '../handlers/recipeHandler';
import { requireAuth } from '../middleware/auth';

export const recipeRouter = Router();

recipeRouter.get('/', listRecipes);
recipeRouter.get('/:id', getRecipeById);
recipeRouter.post('/', requireAuth, createRecipe);
