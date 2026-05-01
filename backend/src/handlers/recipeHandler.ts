import { Request, Response } from 'express';
import { pool } from '../db';

function mapRecipe(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    servings: row.servings,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    tags: row.tags || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapIngredient(row: any) {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    name: row.name,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    krogerUpc: row.kroger_upc,
  };
}

export async function listRecipes(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const tag = req.query.tag as string | undefined;
  const search = req.query.search as string | undefined;

  try {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (tag) {
      where += ` AND $${pIdx} = ANY(tags)`;
      params.push(tag);
      pIdx++;
    }
    if (search) {
      where += ` AND (name ILIKE $${pIdx} OR description ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM recipes ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT id, name, description, servings, prep_minutes, cook_minutes, tags, created_by, created_at
       FROM recipes ${where} ORDER BY id LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      recipes: dataResult.rows.map(mapRecipe),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    throw err;
  }
}

export async function getRecipeById(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid recipe ID' });
    return;
  }
  try {
    const recipeResult = await pool.query(
      'SELECT id, name, description, servings, prep_minutes, cook_minutes, tags, created_by, created_at FROM recipes WHERE id = $1',
      [id]
    );
    if (recipeResult.rows.length === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    const ingredientsResult = await pool.query(
      'SELECT id, recipe_id, name, quantity, unit, kroger_upc FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY id',
      [id]
    );
    res.json({
      ...mapRecipe(recipeResult.rows[0]),
      ingredients: ingredientsResult.rows.map(mapIngredient),
    });
  } catch (err) {
    throw err;
  }
}

export async function createRecipe(req: Request, res: Response): Promise<void> {
  const { name, description, servings, prepMinutes, cookMinutes, tags, ingredients } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Recipe name is required' });
    return;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO recipes (name, description, servings, prep_minutes, cook_minutes, tags, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name.trim(), description || null, servings || 4, prepMinutes || 0, cookMinutes || 0, tags || [], req.user!.userId]
      );
      const recipe = rows[0];
      const ingredientRows: any[] = [];
      if (Array.isArray(ingredients)) {
        for (const ing of ingredients) {
          if (!ing.name || ing.quantity == null) continue;
          const r = await client.query(
            'INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, kroger_upc) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [recipe.id, ing.name, ing.quantity, ing.unit || null, ing.krogerUpc || null]
          );
          ingredientRows.push(r.rows[0]);
        }
      }
      await client.query('COMMIT');
      res.status(201).json({ ...mapRecipe(recipe), ingredients: ingredientRows.map(mapIngredient) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    throw err;
  }
}
