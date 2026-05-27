import { Request, Response } from 'express';
import { getPool } from '../db';

export interface CalendarEvent {
  id: string;             // `chore-{choreId}-{date}` for virtual, or real UUID
  type: 'chore' | 'activity' | 'meal';
  title: string;
  date: string;           // ISO date string YYYY-MM-DD
  status: 'pending' | 'completed' | 'in_progress' | 'voided';
  color: 'blue' | 'green' | 'orange' | 'grey';
  points?: number;
  frequency?: string;
}

/**
 * GET /api/calendar/:childId?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns merged calendar events:
 *  - Virtual recurring chore instances for the date range
 *  - Activity placeholders (future extension)
 */
export async function getCalendar(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

    const { childId } = req.params;
    const startParam = req.query.start as string;
    const endParam = req.query.end as string;

    if (!childId) { res.status(400).json({ error: 'childId is required' }); return; }

    const start = startParam ? new Date(startParam) : (() => {
      const d = new Date(); d.setDate(1); return d;
    })();
    const end = endParam ? new Date(endParam) : (() => {
      const d = new Date(start); d.setMonth(d.getMonth() + 1); d.setDate(0); return d;
    })();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid start or end date' });
      return;
    }

    // Clamp range to 366 days to prevent abuse
    const maxDays = 366;
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    if (diffDays > maxDays) {
      res.status(400).json({ error: `Date range cannot exceed ${maxDays} days` });
      return;
    }

    // Fetch all active chores for this child (single-assign and group-assign)
    const { rows: choreRows } = await getPool().query(
      `SELECT DISTINCT c.id, c.title, c.frequency, c.reward_points, c.status,
              c.due_date, c.created_at, c.assigned_to_group
       FROM chores c
       LEFT JOIN chore_assignments ca ON ca.chore_id = c.id AND ca.child_id = $1
       WHERE (c.child_id = $1 OR ca.child_id = $1)
         AND c.status NOT IN ('cancelled')
       ORDER BY c.created_at`,
      [childId]
    );

    // Fetch completions in the date range to check which instances are done
    const { rows: completionRows } = await getPool().query(
      `SELECT chore_id, completed_at::date AS completion_date
       FROM chore_completions
       WHERE child_id = $1
         AND completed_at >= $2
         AND completed_at < $3 + interval '1 day'`,
      [childId, toDateStr(start), toDateStr(end)]
    );

    // Build a Set for O(1) lookups: "choreId|YYYY-MM-DD"
    const completedSet = new Set<string>(
      completionRows.map((r: any) => `${r.chore_id}|${toDateStr(r.completion_date)}`)
    );

    const events: CalendarEvent[] = [];

    for (const chore of choreRows) {
      const choreStart = new Date(chore.created_at);
      choreStart.setHours(0, 0, 0, 0);

      const occurrences = generateOccurrences(
        chore.frequency,
        choreStart,
        start,
        end,
        chore.due_date ? new Date(chore.due_date) : null
      );

      for (const date of occurrences) {
        const dateStr = toDateStr(date);
        const isCompleted = completedSet.has(`${chore.id}|${dateStr}`) ||
                            (chore.status === 'completed' && chore.frequency === 'once');
        const status = isCompleted ? 'completed' : 'pending';

        events.push({
          id: `chore-${chore.id}-${dateStr}`,
          type: 'chore',
          title: chore.title,
          date: dateStr,
          status,
          color: isCompleted ? 'grey' : 'blue',
          points: chore.reward_points,
          frequency: chore.frequency,
        });
      }
    }

    // Sort by date ascending
    events.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ start: toDateStr(start), end: toDateStr(end), events });
  } catch (err) {
    console.error('[Calendar] Error:', err);
    res.status(500).json({ error: 'Failed to load calendar' });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date | string): string {
  if (typeof d === 'string') {
    // May already be a date string from postgres
    return d.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Generate all occurrence dates for a chore within [windowStart, windowEnd].
 * Handles daily, weekly, monthly, once.
 * Edge cases: months with varying days (e.g. Feb 29 on non-leap years) are
 * handled by clamping to the last day of the month.
 */
function generateOccurrences(
  frequency: string,
  choreCreatedAt: Date,
  windowStart: Date,
  windowEnd: Date,
  dueDate: Date | null
): Date[] {
  const results: Date[] = [];
  const ws = dateOnly(windowStart);
  const we = dateOnly(windowEnd);

  if (frequency === 'once') {
    // Show on due date if provided and in window, otherwise on creation date
    const target = dueDate ? dateOnly(dueDate) : dateOnly(choreCreatedAt);
    if (target >= ws && target <= we) results.push(target);
    return results;
  }

  // Start iterating from the later of choreCreatedAt and windowStart
  let cursor = dateOnly(Math.max(choreCreatedAt.getTime(), ws.getTime()) === choreCreatedAt.getTime()
    ? choreCreatedAt : ws);

  // Align cursor to first valid recurrence date >= cursor
  if (frequency === 'weekly') {
    const baseDow = choreCreatedAt.getDay(); // day-of-week of creation
    while (cursor.getDay() !== baseDow) {
      cursor = addDays(cursor, 1);
    }
  } else if (frequency === 'monthly') {
    const baseDay = choreCreatedAt.getDate();
    // Move cursor to the correct day of its month, or end of month
    cursor = clampToMonthDay(cursor.getFullYear(), cursor.getMonth(), baseDay);
    if (cursor < dateOnly(choreCreatedAt)) {
      cursor = clampToMonthDay(cursor.getFullYear(), cursor.getMonth() + 1, baseDay);
    }
  }

  let safety = 0;
  while (cursor <= we && safety++ < 1000) {
    if (cursor >= ws) results.push(new Date(cursor));

    switch (frequency) {
      case 'daily':
        cursor = addDays(cursor, 1);
        break;
      case 'weekly':
        cursor = addDays(cursor, 7);
        break;
      case 'monthly': {
        const baseDay = choreCreatedAt.getDate();
        cursor = clampToMonthDay(cursor.getFullYear(), cursor.getMonth() + 1, baseDay);
        break;
      }
      default:
        return results; // unknown frequency
    }
  }

  return results;
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

function clampToMonthDay(year: number, month: number, day: number): Date {
  // month may overflow (e.g. month=12 → January next year)
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0)).getDate();
  const clampedDay = Math.min(day, lastDayOfMonth);
  return new Date(Date.UTC(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), clampedDay));
}
