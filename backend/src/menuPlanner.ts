/**
 * Menu Planner – generates a weekly plan and optionally creates a Kroger cart.
 *
 * Expected environment variables (already used elsewhere):
 *   KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, KROGER_REDIRECT_URI
 *
 * Dependencies (add to package.json if missing):
 *   pg, axios, uuid
 */

import { Pool } from 'pg';
import axios from 'axios';
import { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Helper: pick N random recipes (replace with your own recommendation algo)
// ---------------------------------------------------------------------------
async function pickRandomRecipes(pool: Pool, count: number): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT id FROM recipes ORDER BY random() LIMIT $1`,
    [count]
  );
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Helper: fetch ingredients for a recipe (assumes a join table recipe_ingredients)
// ---------------------------------------------------------------------------
async function getIngredientsForRecipe(pool: Pool, recipeId: number) {
  const { rows } = await pool.query(
    `SELECT ri.name, ri.quantity, ri.unit
       FROM recipe_ingredients ri
      WHERE ri.recipe_id = $1`,
    [recipeId]
  );
  return rows; // [{name, quantity, unit}]
}

// ---------------------------------------------------------------------------
// Helper: compute missing items given pantry stock (simple subtraction)
// pantryRows: [{upc, qty}] – you already have a table `pantry_items`
// ---------------------------------------------------------------------------
async function computeMissing(pool: Pool, needed: any[]) {
  const missing: any[] = [];

  for (const ing of needed) {
    const { rows } = await pool.query(
      `SELECT quantity FROM pantry_items WHERE name = $1`,
      [ing.name]
    );

    const pantryQty = rows.length ? Number(rows[0].quantity) : 0;
    const deficit = ing.quantity - pantryQty;

    if (deficit > 0) {
      missing.push({ ...ing, quantity: deficit });
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Main endpoint handler: POST /api/menu/plan
// ---------------------------------------------------------------------------
export async function planWeek(req: Request, res: Response) {
  const pool: Pool = req.app.get('db') as Pool; // injected in server.ts
  const userId = (req.session as any).userId; // adjust to your auth middleware

  // 1. Determine ISO week/year (defaults to current week)
  const today = new Date();
  const isoWeek = getISOWeek(today);
  const year = today.getFullYear();

  // 2. Create a new weekly_menu row
  const { rows: menuRows } = await pool.query(
    `INSERT INTO weekly_menu (owner_id, year, iso_week)
         VALUES ($1, $2, $3)
      RETURNING id`,
    [userId, year, isoWeek]
  );
  const menuId = menuRows[0].id;

  // 3. Pick 7 recipes (one per day)
  const recipeIds = await pickRandomRecipes(pool, 7);

  // 4. Persist each day
  const dayInsertPromises = recipeIds.map((rid, idx) =>
    pool.query(
      `INSERT INTO menu_item (menu_id, day_of_week, recipe_id)
           VALUES ($1, $2, $3)`,
      [menuId, idx + 1, rid] // day_of_week: 1=Mon … 7=Sun
    )
  );
  await Promise.all(dayInsertPromises);

  // 5. Gather all ingredients for the week
  const ingredientPromises = recipeIds.map((rid) =>
    getIngredientsForRecipe(pool, rid)
  );
  const ingredientLists = await Promise.all(ingredientPromises);
  const flatIngredients = ([] as any[]).concat(...ingredientLists);

  // 6. Compute missing items vs pantry
  const missing = await computeMissing(pool, flatIngredients);

  // 7. OPTIONAL – auto-create Kroger cart for missing items
  let krogerCartInfo = null;
  if (missing.length && req.query.createCart === 'true') {
    krogerCartInfo = await createKrogerCart(
      (req.session as any).kroger,
      missing
    );
  }

  // 8. Respond
  res.json({
    menuId,
    week: isoWeek,
    year,
    plan: recipeIds.map((rid, idx) => ({
      day: idx + 1,
      recipeId: rid,
    })),
    ingredients: flatIngredients,
    missing,
    krogerCart: krogerCartInfo,
  });
}

// ---------------------------------------------------------------------------
// Kroger helper – reuse the same logic you already have for token handling.
// This function expects a valid OAuth token stored in the session.
// ---------------------------------------------------------------------------
async function createKrogerCart(krogerSession: any, missingItems: any[]) {
  const token = krogerSession?.access_token;
  if (!token) throw new Error('Kroger not authenticated');

  // 1. Create cart
  const cartRes = await axios.post(
    'https://api.kroger.com/v1/cart',
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const cartId = cartRes.data.cartId;

  // 2. Resolve each missing ingredient to a Kroger product ID
  const resolved = await Promise.all(
    missingItems.map(async (item) => {
      const prodRes = await axios.get(
        `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(
          item.name
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const match = prodRes.data.data?.[0];
      return {
        itemId: match?.itemId,
        quantity: Math.ceil(item.quantity), // round up to whole units
        name: item.name,
      };
    })
  );

  // 3. Add to cart (filter out any that didn't resolve)
  const toAdd = resolved.filter((i) => i.itemId);
  await axios.post(
    `https://api.kroger.com/v1/cart/${cartId}/items`,
    { items: toAdd.map((i) => ({ itemId: i.itemId, quantity: i.quantity })) },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 4. Return a tiny summary (you can extend with checkout later)
  return { cartId, itemsAdded: toAdd };
}

// ---------------------------------------------------------------------------
// Utility: compute ISO 8601 week number for a given date
// ---------------------------------------------------------------------------
function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}
