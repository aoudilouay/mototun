import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const ACCENT_STYLES = {
  teal: {
    badge: 'border-teal-200 bg-teal-50 text-teal-700',
    selected: 'border-teal-300 bg-teal-50 text-teal-700',
    dot: 'bg-teal-500',
    count: 'bg-teal-600 text-white'
  },
  emerald: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    selected: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    count: 'bg-emerald-600 text-white'
  },
  blue: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    selected: 'border-blue-300 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
    count: 'bg-blue-600 text-white'
  }
};

function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (!value) return null;

  let normalized = value;
  if (typeof value === 'string') {
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
    if (!hasTimezone) {
      normalized = `${value}Z`;
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromDayKey(key) {
  const parts = String(key).split('-').map((value) => Number(value));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function buildMonthCells(viewMonth) {
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatDate(date, locale) {
  return date.toLocaleDateString(locale || 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDayTitle(date, locale) {
  return date.toLocaleDateString(locale || 'fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatTime(date, locale) {
  return date.toLocaleTimeString(locale || 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatEventTime(date, locale) {
  return date.toLocaleTimeString(locale || 'fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function normalizeEvents(events) {
  return events
    .map((event, index) => {
      const date = parseDate(event?.at);
      if (!date) return null;

      return {
        id: String(event?.id ?? `calendar-item-${index}`),
        title: String(event?.title ?? 'Activite'),
        message: String(event?.message ?? ''),
        date,
        link: event?.link ? String(event.link) : null
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function ValueTile({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-1 h-7 w-24 animate-pulse rounded-md bg-slate-200" />
      ) : (
        <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
      )}
    </div>
  );
}

function AgendaItem({ item, locale, dotClass }) {
  const baseClass = 'flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 transition-colors hover:bg-slate-50';
  const content = (
    <>
      <div className="flex min-w-0 items-start gap-2">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
          {item.message ? <p className="truncate text-xs text-slate-500">{item.message}</p> : null}
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-slate-500">{formatEventTime(item.date, locale)}</span>
    </>
  );

  if (!item.link) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <Link to={item.link} className={baseClass}>
      {content}
    </Link>
  );
}

function LiveCalendarPanel({
  className = '',
  locale = 'fr-FR',
  title = 'Calendrier live',
  subtitle = 'Vue en temps reel',
  events = [],
  primary = { label: 'Valeur du jour', value: '-' },
  secondary = { label: 'Evenements aujourd hui', value: '0' },
  loading = false,
  accent = 'teal'
}) {
  const [now, setNow] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDayKey(new Date()));

  const accentStyles = ACCENT_STYLES[accent] || ACCENT_STYLES.teal;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const normalizedEvents = useMemo(() => normalizeEvents(events), [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map();

    normalizedEvents.forEach((item) => {
      const key = toDayKey(item.date);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        map.set(key, [item]);
      }
    });

    map.forEach((items, key) => {
      map.set(key, [...items].sort((a, b) => b.date.getTime() - a.date.getTime()));
    });

    return map;
  }, [normalizedEvents]);

  const monthCells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const selectedDate = useMemo(() => fromDayKey(selectedDayKey), [selectedDayKey]);
  const selectedItems = eventsByDay.get(selectedDayKey) || [];

  const monthEventsCount = useMemo(() => {
    return monthCells.reduce((total, day) => {
      if (day.getMonth() !== viewMonth.getMonth() || day.getFullYear() !== viewMonth.getFullYear()) {
        return total;
      }

      return total + (eventsByDay.get(toDayKey(day))?.length || 0);
    }, 0);
  }, [eventsByDay, monthCells, viewMonth]);

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Live</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{formatTime(now, locale)}</p>
          <p className="text-[11px] text-slate-500">{formatDate(now, locale)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ValueTile label={primary.label} value={primary.value} loading={loading} />
        <ValueTile label={secondary.label} value={secondary.value} loading={loading} />
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Events ce mois</p>
          {loading ? (
            <div className="mt-1 h-7 w-24 animate-pulse rounded-md bg-slate-200" />
          ) : (
            <p className="mt-1 text-xl font-black text-slate-900">{monthEventsCount}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            aria-label="Mois precedent"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="text-sm font-bold capitalize text-slate-800">
            {viewMonth.toLocaleDateString(locale || 'fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={() => setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            aria-label="Mois suivant"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEK_DAYS.map((day) => (
            <p key={day} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {day}
            </p>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {monthCells.map((day) => {
            const key = toDayKey(day);
            const count = eventsByDay.get(key)?.length || 0;
            const isCurrentMonth = day.getMonth() === viewMonth.getMonth() && day.getFullYear() === viewMonth.getFullYear();
            const isToday = key === toDayKey(now);
            const isSelected = key === selectedDayKey;

            const buttonClass = [
              'relative h-11 rounded-xl border text-left transition-colors',
              isSelected ? accentStyles.selected : 'border-transparent bg-white text-slate-700 hover:border-slate-200',
              isCurrentMonth ? '' : 'text-slate-400 opacity-60',
              isToday && !isSelected ? 'border-slate-300 bg-slate-100/80 text-slate-900' : ''
            ].join(' ');

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDayKey(key)}
                className={buttonClass}
              >
                <span className="absolute left-2 top-1 text-xs font-semibold">{day.getDate()}</span>
                {count > 0 ? (
                  <span className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${accentStyles.count}`}>
                    {count > 9 ? '9+' : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            Agenda {selectedDate ? formatDayTitle(selectedDate, locale) : ''}
          </p>
          <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${accentStyles.badge}`}>
            {selectedItems.length} event(s)
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : selectedItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm font-medium text-slate-600">
            Aucune activite sur cette date.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedItems.slice(0, 4).map((item) => (
              <AgendaItem key={item.id} item={item} locale={locale} dotClass={accentStyles.dot} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default LiveCalendarPanel;
