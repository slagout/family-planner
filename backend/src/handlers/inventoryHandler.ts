import { Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../db';
import { krogerService } from '../services/krogerService';

const SECTION_TABLE: Record<string, string> = {
  pantry:       'pantry_items',
  freezer:      'freezer_items',
  refrigerator: 'refrigerator_items',
  bulk:         'bulk_cooking_batches',
};

const NAME_COL: Record<string, string> = {
  pantry: 'name', freezer: 'name', refrigerator: 'name', bulk: 'batch_name',
};

const BLOCKED = new Set(['id', 'created_at', 'updated_at', 'user_id']);

function resolveTable(section: string): string | null {
  return SECTION_TABLE[section] ?? null;
}

// GET /api/inventory/:section
export async function listInventory(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }

  const userId = req.user!.userId;
  const { expiring, category, search } = req.query;
  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let idx = 2;

  if (expiring) {
    const days = Math.max(1, Math.min(365, parseInt(String(expiring), 10) || 7));
    conditions.push(`expiration_date IS NOT NULL AND expiration_date <= CURRENT_DATE + INTERVAL '${days} days'`);
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(String(category));
  }
  if (search) {
    conditions.push(`${NAME_COL[req.params.section] ?? 'name'} ILIKE $${idx++}`);
    params.push(`%${String(search)}%`);
  }

  const orderBy = req.params.section === 'bulk'
    ? 'meal_plan_date ASC NULLS LAST, batch_name'
    : 'expiration_date ASC NULLS LAST, name';

  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy}`,
    params,
  );
  res.json(rows);
}

// GET /api/inventory/:section/:id
export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Item not found' }); return; }
  res.json(rows[0]);
}

// POST /api/inventory/:section
export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }

  const userId = req.user!.userId;
  const fields = Object.keys(req.body).filter(k => !BLOCKED.has(k));
  const allFields = ['user_id', ...fields];
  const allValues: unknown[] = [userId, ...fields.map(f => req.body[f] ?? null)];
  const cols = allFields.join(', ');
  const phs  = allFields.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${phs}) RETURNING *`,
    allValues,
  );
  res.status(201).json(rows[0]);
}

// PUT /api/inventory/:section/:id
export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const fields = Object.keys(req.body).filter(k => !BLOCKED.has(k));
  if (fields.length === 0) { res.status(400).json({ error: 'No updatable fields provided' }); return; }

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values: unknown[] = [...fields.map(f => req.body[f] ?? null), id, req.user!.userId];

  const { rows } = await pool.query(
    `UPDATE ${table} SET ${setClause}, updated_at = now()
     WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}
     RETURNING *`,
    values,
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Item not found or not owned by you' }); return; }
  res.json(rows[0]);
}

// DELETE /api/inventory/:section/:id
export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { rowCount } = await pool.query(
    `DELETE FROM ${table} WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId],
  );
  if (!rowCount) { res.status(404).json({ error: 'Item not found or not owned by you' }); return; }
  res.status(204).send();
}

// POST /api/inventory/:section/import  — body: { rows: Record<string,string>[] }
export async function importInventoryCSV(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }

  const csvRows: Record<string, string>[] = req.body?.rows;
  if (!Array.isArray(csvRows) || csvRows.length === 0) {
    res.status(400).json({ error: 'Provide { rows: [...] } — parse CSV client-side first' });
    return;
  }

  const userId = req.user!.userId;
  const client = await pool.connect();
  let insertedCount = 0;
  const errors: string[] = [];

  try {
    await client.query('BEGIN');
    for (const row of csvRows.slice(0, 500)) {
      try {
        const item: Record<string, unknown> = { user_id: userId };
        for (const [k, v] of Object.entries(row)) {
          if (!BLOCKED.has(k) && v !== '' && v != null) item[k] = v;
        }
        const fields = Object.keys(item);
        const ph = fields.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${ph})`,
          fields.map(f => item[f]),
        );
        insertedCount++;
      } catch (e: unknown) {
        const label = (row as Record<string, string>).name || (row as Record<string, string>).batch_name || '(unknown)';
        errors.push(`"${label}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  res.json({ inserted: insertedCount, errors });
}

// GET /api/inventory/:section/export
export async function exportInventoryCSV(req: Request, res: Response): Promise<void> {
  const table = resolveTable(req.params.section);
  if (!table) { res.status(400).json({ error: 'Invalid inventory section' }); return; }

  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY id`,
    [req.user!.userId],
  );

  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'user_id') : [];
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.section}-export.csv"`);
  res.send(csv);
}

// GET /api/inventory/barcode/:upc
export async function lookupBarcode(req: Request, res: Response): Promise<void> {
  const { upc } = req.params;
  if (!upc || !/^\d{8,14}$/.test(upc)) {
    res.status(400).json({ error: 'Invalid UPC — must be 8-14 digits' });
    return;
  }
  try {
    const token = await krogerService.getAccessToken();
    const response = await axios.get(
      `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(upc)}&filter.limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 },
    );
    const product = response.data?.data?.[0];
    if (!product) { res.status(404).json({ error: 'Product not found for this UPC' }); return; }
    res.json({
      upc,
      name:           product.description,
      brand:          product.brand ?? null,
      category:       product.categories?.[0] ?? null,
      kroger_item_id: product.items?.[0]?.itemId ?? product.productId ?? null,
      size:           product.items?.[0]?.size ?? null,
    });
  } catch {
    res.status(503).json({ error: 'Kroger product lookup temporarily unavailable' });
  }
}
