/**
 * Home Assistant REST API
 * ========================
 * These endpoints use a static Bearer token (HA_API_TOKEN env var) instead of
 * JWT so Home Assistant's `rest:` integration can poll without user sessions.
 *
 * Set HA_API_TOKEN to any long random string in your .env:
 *   node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Then in Home Assistant configuration.yaml:
 *   rest:
 *     - resource: http://192.168.200.45:4000/api/ha/summary
 *       headers:
 *         Authorization: "Bearer YOUR_HA_API_TOKEN"
 *       ...
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db';

export const haRouter = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireHaToken(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.HA_API_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'HA_API_TOKEN not configured on server' });
    return;
  }
  const auth = (req.headers.authorization ?? '').trim();
  if (auth !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Invalid HA_API_TOKEN' });
    return;
  }
  next();
}

// ── GET /api/ha/summary ────────────────────────────────────────────────────────
// Returns a today-snapshot suitable for HA sensor entities.
haRouter.get('/summary', requireHaToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool  = getPool();
    const today = new Date().toISOString().split('T')[0];

    const [chores, meals, expiring, children] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE completed = true)  AS done,
           COUNT(*)                                   AS total
         FROM chores
         WHERE due_date = $1`,
        [today]
      ).catch(() => ({ rows: [{ done: 0, total: 0 }] })),

      pool.query(
        `SELECT meal_type, recipe_name AS name
         FROM menu_plans
         WHERE plan_date = $1
         ORDER BY meal_type`,
        [today]
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM inventory
         WHERE expiry_date IS NOT NULL
           AND expiry_date::date <= ($1::date + interval '3 days')
           AND expiry_date::date >= $1::date`,
        [today]
      ).catch(() => ({ rows: [{ count: 0 }] })),

      pool.query(
        `SELECT id, name, points, color FROM children ORDER BY name`
      ).catch(() => ({ rows: [] })),
    ]);

    res.json({
      date:            today,
      chores_done:     Number(chores.rows[0]?.done  ?? 0),
      chores_total:    Number(chores.rows[0]?.total ?? 0),
      meals:           meals.rows,
      expiring_items:  Number(expiring.rows[0]?.count ?? 0),
      children:        children.rows,
    });
  } catch (err) {
    console.error('[HA] /summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/ha/week ───────────────────────────────────────────────────────────
// Returns this week's meal + chore grid for an HA calendar or markdown card.
haRouter.get('/week', requireHaToken, async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool  = getPool();
    const today = new Date();

    // Monday of current week
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [meals, chores] = await Promise.all([
      pool.query(
        `SELECT plan_date::text AS date, meal_type, recipe_name AS name
         FROM menu_plans
         WHERE plan_date BETWEEN $1 AND $2
         ORDER BY plan_date, meal_type`,
        [fmt(monday), fmt(sunday)]
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT
           c.due_date::text  AS date,
           c.name,
           c.completed,
           ch.name           AS child_name,
           ch.color          AS child_color
         FROM chores c
         LEFT JOIN children ch ON ch.id = c.child_id
         WHERE c.due_date BETWEEN $1 AND $2
         ORDER BY c.due_date, ch.name`,
        [fmt(monday), fmt(sunday)]
      ).catch(() => ({ rows: [] })),
    ]);

    res.json({
      week_start: fmt(monday),
      week_end:   fmt(sunday),
      meals:      meals.rows,
      chores:     chores.rows,
    });
  } catch (err) {
    console.error('[HA] /week error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
