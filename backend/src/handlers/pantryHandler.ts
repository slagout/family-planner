import { Request, Response } from 'express';
import { pool } from '../db';

function mapPantryItem(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    updatedAt: row.updated_at,
  };
}

export async function listPantry(req: Request, res: Response): Promise<void> {
  try {
    const { rows } = await pool.query(
      'SELECT id, user_id, name, quantity, unit, updated_at FROM pantry_items WHERE user_id = $1 ORDER BY name',
      [req.user!.userId]
    );
    res.json(rows.map(mapPantryItem));
  } catch (err) {
    throw err;
  }
}

export async function upsertPantryItem(req: Request, res: Response): Promise<void> {
  const { name, quantity, unit } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Item name is required' });
    return;
  }
  if (quantity == null || isNaN(parseFloat(quantity)) || parseFloat(quantity) < 0) {
    res.status(400).json({ error: 'Valid quantity is required' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO pantry_items (user_id, name, quantity, unit, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, name, unit) DO UPDATE
         SET quantity = pantry_items.quantity + EXCLUDED.quantity,
             updated_at = now()
       RETURNING *`,
      [req.user!.userId, name.trim(), parseFloat(quantity), unit || null]
    );
    res.status(201).json(mapPantryItem(rows[0]));
  } catch (err) {
    throw err;
  }
}

export async function updatePantryItem(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid pantry item ID' });
    return;
  }
  const { quantity, unit } = req.body;
  if (quantity == null || isNaN(parseFloat(quantity)) || parseFloat(quantity) < 0) {
    res.status(400).json({ error: 'Valid quantity is required' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `UPDATE pantry_items SET quantity = $1, unit = $2, updated_at = now()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [parseFloat(quantity), unit || null, id, req.user!.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Pantry item not found or not owned by you' });
      return;
    }
    res.json(mapPantryItem(rows[0]));
  } catch (err) {
    throw err;
  }
}

export async function deletePantryItem(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid pantry item ID' });
    return;
  }
  try {
    const { rows } = await pool.query(
      'DELETE FROM pantry_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Pantry item not found or not owned by you' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    throw err;
  }
}
