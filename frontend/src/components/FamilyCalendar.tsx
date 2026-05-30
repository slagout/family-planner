import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayMeal  { mealType: string; name: string }
interface DayChore { name: string; childName: string; childColor: string; completed: boolean }
interface DayData  { date: Date; meals: DayMeal[]; chores: DayChore[] }
interface Child    { id: string; name: string; color?: string; points?: number }

// ─── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const MEAL_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  breakfast: { bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-800 dark:text-amber-300',    icon: '🌅' },
  lunch:     { bg: 'bg-sky-100 dark:bg-sky-900/40',         text: 'text-sky-800 dark:text-sky-300',        icon: '☀️'  },
  dinner:    { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300',icon: '🍽️' },
  snack:     { bg: 'bg-rose-100 dark:bg-rose-900/40',       text: 'text-rose-800 dark:text-rose-300',      icon: '🍎' },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toISODate(d: Date): string { return d.toISOString().split('T')[0]; }
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function getMonday(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function FamilyCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays]             = useState<DayData[]>([]);
  const [children, setChildren]     = useState<Child[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const today  = new Date(); today.setHours(0,0,0,0);
  const monday = addDays(getMonday(today), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const midWeek   = weekDates[3];
  const monthLabel = `${MONTH_NAMES[midWeek.getMonth()]} ${midWeek.getFullYear()}`;
  const weekLabel  = `${weekDates[0].getDate()}\u2013${weekDates[6].getDate()} ${MONTH_NAMES[weekDates[6].getMonth()]}`;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [menuRes, choresRes, childrenRes] = await Promise.allSettled([
        client.get('/menu/current'),
        client.get('/chores'),
        client.get('/chores/children'),
      ]);

      // Child colour map
      const childMap: Record<string, { name: string; color: string }> = {};
      const childList: Child[] = [];
      if (childrenRes.status === 'fulfilled') {
        (childrenRes.value.data ?? []).forEach((c: Child, i: number) => {
          const colour = c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          childMap[c.id] = { name: c.name, color: colour };
          childList.push({ ...c, color: colour });
        });
      }
      setChildren(childList);

      // Meals: map plan day index → week dates
      const mealsByDate: Record<string, DayMeal[]> = {};
      if (menuRes.status === 'fulfilled') {
        const planDays: Record<string, { name?: string } | undefined>[] =
          menuRes.value.data?.menu?.days ?? [];
        planDays.forEach((dayPlan, i) => {
          const key = toISODate(addDays(monday, i));
          mealsByDate[key] = [];
          (['breakfast','lunch','dinner','snack'] as const).forEach(type => {
            const entry = (dayPlan as Record<string, { name?: string } | undefined>)[type];
            if (entry?.name) mealsByDate[key].push({ mealType: type, name: entry.name });
          });
        });
      }

      // Chores: group by due_date
      const choresByDate: Record<string, DayChore[]> = {};
      if (choresRes.status === 'fulfilled') {
        (choresRes.value.data ?? []).forEach((chore: Record<string, unknown>) => {
          const raw = (chore.due_date ?? chore.dueDate) as string | undefined;
          if (!raw) return;
          const key = raw.split('T')[0];
          if (!choresByDate[key]) choresByDate[key] = [];
          const childId = (chore.child_id ?? chore.childId) as string | undefined;
          const childInfo = childId ? childMap[childId] : undefined;
          choresByDate[key].push({
            name:       String(chore.name  ?? chore.title ?? 'Chore'),
            childName:  String(chore.child_name ?? chore.childName ?? childInfo?.name ?? 'Family'),
            childColor: String(chore.child_color ?? childInfo?.color ?? '#6b7280'),
            completed:  !!(chore.completed || chore.status === 'completed'),
          });
        });
      }

      setDays(weekDates.map(date => ({
        date,
        meals:  mealsByDate[toISODate(date)]  ?? [],
        chores: choresByDate[toISODate(date)] ?? [],
      })));
    } catch (err) {
      setError('Could not load calendar data.');
      console.error('[FamilyCalendar]', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50
                    dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-8">
      <div className="max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
              Family Calendar
            </h1>
            <p className="text-slate-500 dark:text-neutral-400 font-medium mt-1.5">
              {monthLabel}&nbsp;&nbsp;·&nbsp;&nbsp;{weekLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(v => v - 1)} aria-label="Previous week"
              className="w-10 h-10 flex items-center justify-center rounded-full
                         bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md border
                         border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-300
                         text-xl font-bold transition">
              ‹
            </button>
            <button onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}
              className="px-5 py-2 rounded-full text-sm font-bold bg-white dark:bg-neutral-800
                         shadow-sm hover:shadow-md border border-slate-200 dark:border-neutral-700
                         text-slate-700 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-default transition">
              Today
            </button>
            <button onClick={() => setWeekOffset(v => v + 1)} aria-label="Next week"
              className="w-10 h-10 flex items-center justify-center rounded-full
                         bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md border
                         border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-300
                         text-xl font-bold transition">
              ›
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200
                          dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Calendar grid — horizontal-scroll on small screens */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="grid grid-cols-7 gap-2" style={{ minWidth: '700px' }}>
                {days.map(({ date, meals, chores }, col) => {
                  const isToday   = toISODate(date) === toISODate(today);
                  const isPast    = date < today;
                  const isWeekend = col >= 5;
                  return (
                    <div key={col}
                      className={[
                        'flex flex-col rounded-2xl overflow-hidden transition-shadow',
                        isToday
                          ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-indigo-950'
                          : 'ring-1 ring-slate-200 dark:ring-neutral-700 shadow-sm hover:shadow-md',
                        isWeekend && !isToday
                          ? 'bg-slate-50/80 dark:bg-neutral-800/60'
                          : 'bg-white dark:bg-neutral-800',
                        isPast && !isToday ? 'opacity-65' : '',
                      ].join(' ')}
                    >
                      {/* Day header */}
                      <div className={`px-3 pt-3 pb-2.5 text-center
                                      ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]
                                     text-slate-400 dark:text-neutral-500 mb-1.5">
                          {DAY_NAMES_SHORT[col]}
                        </p>
                        <span className={[
                          'inline-flex items-center justify-center w-10 h-10 rounded-full',
                          'text-[22px] font-black leading-none select-none',
                          isToday
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-300 dark:shadow-indigo-900'
                            : isPast
                              ? 'text-slate-400 dark:text-neutral-500'
                              : 'text-slate-700 dark:text-neutral-100',
                        ].join(' ')}>
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Events */}
                      <div className="flex-1 px-2 pb-3 pt-0.5 flex flex-col gap-1.5 min-h-[150px]">
                        {meals.map((meal, j) => {
                          const s = MEAL_STYLE[meal.mealType] ?? MEAL_STYLE.dinner;
                          return (
                            <div key={`m${j}`} title={`${meal.mealType}: ${meal.name}`}
                              className={`rounded-xl px-2 py-1 text-[11px] font-semibold
                                         leading-tight ${s.bg} ${s.text}`}>
                              <span>{s.icon}</span>
                              <span className="block truncate mt-0.5">{meal.name}</span>
                            </div>
                          );
                        })}
                        {chores.map((chore, j) => (
                          <div key={`c${j}`} title={`${chore.childName}: ${chore.name}`}
                            className={[
                              'rounded-xl px-2 py-1 text-[11px] font-semibold leading-tight',
                              'flex items-center gap-1.5',
                              chore.completed
                                ? 'bg-slate-100 text-slate-400 dark:bg-neutral-700/60 dark:text-neutral-500 line-through'
                                : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                            ].join(' ')}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0 border border-white/60"
                                  style={{ backgroundColor: chore.childColor }} />
                            <span className="truncate">{chore.name}</span>
                          </div>
                        ))}
                        {!meals.length && !chores.length && (
                          <p className="text-xs text-slate-200 dark:text-neutral-700 text-center mt-auto pt-4">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend + children points row */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {(['breakfast','lunch','dinner','snack'] as const).map(type => {
                const s = MEAL_STYLE[type];
                return (
                  <span key={type}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                    {s.icon} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                );
              })}
              <span className="px-3 py-1 rounded-full text-xs font-bold
                              bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                ✅ Chore
              </span>
              {children.length > 0 && (
                <span className="text-slate-300 dark:text-neutral-600 select-none">|</span>
              )}
              {children.map(child => (
                <span key={child.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                             bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700
                             text-slate-700 dark:text-neutral-200 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: child.color }} />
                  {child.name}
                  {child.points !== undefined && (
                    <span className="text-indigo-500 dark:text-indigo-400 ml-0.5">
                      ·&nbsp;{child.points}pts
                    </span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FamilyCalendar;
