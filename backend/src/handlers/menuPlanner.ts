import { Request, Response } from 'express';
import { pool } from '../db';
import { krogerService } from '../services/krogerService';
import { MissingIngredient, MealPlanResponse } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getISOWeek(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

export async function planWeek(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const isoDefault = getISOWeek(new Date());
  const weekNumber = parseInt(req.body.weekNumber) || isoDefault.weekNumber;
  const year = parseInt(req.body.year) || isoDefault.year;
  const createCart = req.body.createCart === true || req.body.createCart === 'true';

  try {
    // Step 1: Ensure enough recipes exist
    const countResult = await pool.query('SELECT COUNT(*) FROM recipes');
    const recipeCount = parseInt(countResult.rows[0].count);
    if (recipeCount < 7) {
      res.status(400).json({
        error: `Need at least 7 recipes to generate a plan. Currently have ${recipeCount}.`,
      });
      return;
    }

    // Step 2: Pick 7 random recipes
    const recipesResult = await pool.query(
      'SELECT id, name, description, prep_minutes, cook_minutes, tags FROM recipes ORDER BY RANDOM() LIMIT 7'
    );
    const recipes = recipesResult.rows;

    // Step 3: Handle existing plan for this week
    const existingMenu = await pool.query(
      'SELECT id FROM weekly_menu WHERE user_id = $1 AND week_number = $2 AND year = $3',
      [userId, weekNumber, year]
    );

    let menuId: number;
    if (existingMenu.rows.length > 0) {
      menuId = existingMenu.rows[0].id;
      await pool.query('DELETE FROM menu_item WHERE weekly_menu_id = $1', [menuId]);
    } else {
      const menuResult = await pool.query(
        'INSERT INTO weekly_menu (user_id, week_number, year) VALUES ($1, $2, $3) RETURNING id',
        [userId, weekNumber, year]
      );
      menuId = menuResult.rows[0].id;
    }

    // Steps 4-5: Insert menu items Mon–Sun
    for (let i = 0; i < 7; i++) {
      await pool.query(
        'INSERT INTO menu_item (weekly_menu_id, recipe_id, day_of_week) VALUES ($1, $2, $3)',
        [menuId, recipes[i].id, DAYS[i]]
      );
    }

    // Steps 6-8: Aggregate ingredients across all 7 recipes
    const recipeIds = recipes.map((r: any) => r.id);
    const ingredientsResult = await pool.query(
      'SELECT name, quantity, unit, kroger_upc FROM recipe_ingredients WHERE recipe_id = ANY($1)',
      [recipeIds]
    );

    const aggregated = new Map<string, MissingIngredient>();
    for (const ing of ingredientsResult.rows) {
      const key = `${ing.name.toLowerCase()}|${(ing.unit || '').toLowerCase()}`;
      if (aggregated.has(key)) {
        aggregated.get(key)!.quantity += parseFloat(ing.quantity);
      } else {
        aggregated.set(key, {
          name: ing.name,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
          krogerUpc: ing.kroger_upc,
        });
      }
    }

    // Steps 9-10: Subtract pantry stock
    const pantryResult = await pool.query(
      'SELECT name, quantity, unit FROM pantry_items WHERE user_id = $1',
      [userId]
    );
    const pantryMap = new Map<string, number>();
    for (const p of pantryResult.rows) {
      pantryMap.set(`${p.name.toLowerCase()}|${(p.unit || '').toLowerCase()}`, parseFloat(p.quantity));
    }

    const missingIngredients: MissingIngredient[] = [];
    for (const [key, ing] of aggregated.entries()) {
      const pantryQty = pantryMap.get(key) || 0;
      const deficit = ing.quantity - pantryQty;
      if (deficit > 0) {
        missingIngredients.push({ ...ing, quantity: deficit });
      }
    }

    // Step 11: Optional Kroger cart
    let krogerCartId: string | undefined;
    let krogerUnmatchedItems: string[] | undefined;
    let krogerMessage: string | undefined;

    if (createCart) {
      if (!process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET) {
        krogerMessage = 'Kroger integration not configured — set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET';
      } else if (missingIngredients.length === 0) {
        krogerMessage = 'No missing ingredients — cart not created';
      } else {
        try {
          // Extract CustomerContext token from the Authorization header for cart.basic:write
          const authHeader = req.headers.authorization;
          const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
          const result = await krogerService.createCartWithItems(missingIngredients, userAccessToken);
          krogerCartId = result.cartId;
          krogerUnmatchedItems = result.unmatchedIngredients;
        } catch (err: any) {
          krogerMessage = `Kroger cart creation failed: ${err.message}`;
        }
      }
    }

    // Step 12: Respond
    const response: MealPlanResponse = {
      menu: {
        id: menuId,
        weekNumber,
        year,
        days: recipes.map((r: any, i: number) => ({
          day: DAYS[i],
          recipe: {
            id: r.id,
            name: r.name,
            description: r.description,
            prepMinutes: r.prep_minutes,
            cookMinutes: r.cook_minutes,
            tags: r.tags || [],
          },
        })),
      },
      missingIngredients,
      ...(krogerCartId && { krogerCartId }),
      ...(krogerUnmatchedItems && { krogerUnmatchedItems }),
      ...(krogerMessage && { krogerMessage }),
    };

    res.json(response);
  } catch (err) {
    throw err;
  }
}

export async function getCurrentMenu(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { weekNumber, year } = getISOWeek(new Date());

  try {
    const menuResult = await pool.query(
      'SELECT id, week_number, year, created_at FROM weekly_menu WHERE user_id = $1 AND week_number = $2 AND year = $3',
      [userId, weekNumber, year]
    );
    if (menuResult.rows.length === 0) {
      res.status(404).json({ error: 'No plan found for the current week' });
      return;
    }
    const menu = menuResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT mi.day_of_week, r.id, r.name, r.description, r.prep_minutes, r.cook_minutes, r.tags
       FROM menu_item mi
       JOIN recipes r ON r.id = mi.recipe_id
       WHERE mi.weekly_menu_id = $1
       ORDER BY array_position(ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::varchar[], mi.day_of_week)`,
      [menu.id]
    );

    res.json({
      menu: {
        id: menu.id,
        weekNumber: menu.week_number,
        year: menu.year,
        days: itemsResult.rows.map((row: any) => ({
          day: row.day_of_week,
          recipe: {
            id: row.id,
            name: row.name,
            description: row.description,
            prepMinutes: row.prep_minutes,
            cookMinutes: row.cook_minutes,
            tags: row.tags || [],
          },
        })),
      },
    });
  } catch (err) {
    throw err;
  }
}

export async function deleteMenu(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid menu ID' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'DELETE FROM weekly_menu WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Menu not found or not owned by you' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    throw err;
  }
}
