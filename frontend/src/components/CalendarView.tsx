import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { calendarAPI, type CalendarEvent } from '../api/familyApi';

type CalendarView = 'day' | 'week' | 'month' | 'year';

const COLOR_MAP: Record<CalendarEvent['color'], string> = {
  blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  green:  'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  grey:   'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 line-through',
};

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ---------------------------------------------------------------------------
// Top-level component
// ---------------------------------------------------------------------------

export function CalendarView({ childId }: { childId: string }) {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [start, end] = useMemo(() => computeRange(currentDate, view), [currentDate, view]);

  const fetchEvents = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await calendarAPI.get(childId, toDateStr(start), toDateStr(end));
      setEvents(data.events);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [childId, start, end]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Index events by date string for fast lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [events]);

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (view === 'day')   n.setDate(n.getDate() + dir);
      if (view === 'week')  n.setDate(n.getDate() + dir * 7);
      if (view === 'month') n.setMonth(n.getMonth() + dir);
      if (view === 'year')  n.setFullYear(n.getFullYear() + dir);
      return n;
    });
  };

  const title = useMemo(() => {
    if (view === 'day')  return currentDate.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    if (view === 'week') return `Week of ${toDateStr(start)}`;
    if (view === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    return `${currentDate.getFullYear()}`;
  }, [view, currentDate, start]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] text-xl">‹</button>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white min-w-[200px] text-center">{title}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] text-xl">›</button>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
          {(['day','week','month','year'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 text-sm font-medium min-h-[44px] capitalize transition-colors ${
                view === v
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {loading && <div className="text-center py-6 text-gray-500 text-sm animate-pulse">Loading calendar…</div>}

      {!loading && (
        <>
          {view === 'month' && <MonthView currentDate={currentDate} eventsByDate={eventsByDate} onDayClick={(d) => { setCurrentDate(d); setView('day'); }} />}
          {view === 'week'  && <WeekView  start={start} eventsByDate={eventsByDate} />}
          {view === 'day'   && <DayView   date={currentDate} events={eventsByDate[toDateStr(currentDate)] ?? []} />}
          {view === 'year'  && <YearView  year={currentDate.getFullYear()} eventsByDate={eventsByDate} onMonthClick={(m) => { const d = new Date(currentDate); d.setMonth(m); d.setDate(1); setCurrentDate(d); setView('month'); }} />}
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Chore</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Activity</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Meal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Voided</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------------

function MonthView({ currentDate, eventsByDate, onDayClick }: {
  currentDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (d: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="bg-white dark:bg-gray-800 h-20 md:h-28" />;
          const ds = toDateStr(date);
          const dayEvents = eventsByDate[ds] ?? [];
          const pending = dayEvents.filter(e => e.status === 'pending').length;
          const done = dayEvents.filter(e => e.status === 'completed').length;
          const isToday = ds === today;
          return (
            <button
              key={ds}
              onClick={() => onDayClick(date)}
              className={`bg-white dark:bg-gray-800 h-20 md:h-28 p-1 text-left flex flex-col hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors overflow-hidden`}
            >
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-primary-500 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {date.getDate()}
              </span>
              <div className="flex-1 overflow-hidden space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className={`text-xs px-1 rounded truncate ${COLOR_MAP[ev.color]}`}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400">+{dayEvents.length - 3} more</div>
                )}
              </div>
              {(pending > 0 || done > 0) && (
                <div className="text-xs text-gray-400 mt-1 leading-none">
                  {pending > 0 && <span className="text-orange-500">{pending}▷</span>}
                  {done > 0 && <span className="text-green-500 ml-1">{done}✓</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

function WeekView({ start, eventsByDate }: {
  start: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
}) {
  const today = toDateStr(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((date) => {
        const ds = toDateStr(date);
        const dayEvents = eventsByDate[ds] ?? [];
        const isToday = ds === today;
        return (
          <div key={ds} className={`rounded-lg p-2 min-h-[120px] ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-300' : 'bg-gray-50 dark:bg-gray-700'}`}>
            <p className={`text-xs font-bold mb-1 ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
              {DAY_LABELS[date.getDay()]}<br />{date.getDate()}
            </p>
            <div className="space-y-1">
              {dayEvents.map(ev => (
                <div key={ev.id} className={`text-xs p-1 rounded truncate ${COLOR_MAP[ev.color]}`}>
                  {ev.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day View
// ---------------------------------------------------------------------------

function DayView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const pending = events.filter(e => e.status === 'pending').length;
  const done = events.filter(e => e.status === 'completed').length;
  return (
    <div>
      {events.length > 0 && (
        <div className="flex gap-4 mb-3 text-sm">
          <span className="text-orange-500 font-medium">{pending} Pending</span>
          <span className="text-green-600 font-medium">{done} Done</span>
        </div>
      )}
      {events.length === 0 ? (
        <p className="text-center py-8 text-gray-400">Nothing scheduled for this day.</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className={`flex items-center justify-between p-3 rounded-xl border ${
              ev.color === 'grey' ? 'border-gray-200 bg-gray-50' :
              ev.color === 'blue' ? 'border-blue-200 bg-blue-50' :
              ev.color === 'green' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
            } dark:border-gray-600 dark:bg-gray-700`}>
              <div>
                <p className={`font-medium ${ev.color === 'grey' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                  {ev.title}
                </p>
                {ev.frequency && (
                  <p className="text-xs text-gray-500">{ev.frequency}</p>
                )}
              </div>
              <div className="text-right">
                {ev.points !== undefined && (
                  <span className="text-xs font-semibold text-purple-600">⭐ {ev.points}</span>
                )}
                <div className={`text-xs mt-0.5 ${
                  ev.status === 'completed' ? 'text-green-600' :
                  ev.status === 'pending' ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {ev.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Year View
// ---------------------------------------------------------------------------

function YearView({ year, eventsByDate, onMonthClick }: {
  year: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  onMonthClick: (month: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth key={m} year={year} month={m} eventsByDate={eventsByDate} onClick={() => onMonthClick(m)} />
      ))}
    </div>
  );
}

function MiniMonth({ year, month, eventsByDate, onClick }: {
  year: number; month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  onClick: () => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateStr(new Date());
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <button onClick={onClick} className="text-left p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors w-full">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{MONTH_NAMES[month]}</p>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="h-4" />;
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const hasEvents = (eventsByDate[ds]?.length ?? 0) > 0;
          const isToday = ds === today;
          return (
            <div
              key={ds}
              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                isToday ? 'bg-primary-500 text-white' :
                hasEvents ? 'bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-200' :
                'text-gray-400'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeRange(date: Date, view: CalendarView): [Date, Date] {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (view === 'day') return [d, d];

  if (view === 'week') {
    const dow = d.getDay();
    const start = new Date(d); start.setDate(d.getDate() - dow);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [start, end];
  }

  if (view === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [start, end];
  }

  // year
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return [start, end];
}
