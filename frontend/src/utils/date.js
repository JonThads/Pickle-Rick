// =============================================================================
// Local-timezone-safe date-key helpers
// =============================================================================
// `date.toISOString().slice(0, 10)` looks like a harmless way to get
// "YYYY-MM-DD", but toISOString() converts to UTC first. For any local
// midnight Date in a timezone AHEAD of UTC (e.g. the Philippines, UTC+8),
// that conversion rolls the date back by one day - which is exactly why
// selecting "Aug 4" in the calendar was producing "2026-08-03". Format from
// the Date object's own local getters instead, never through UTC.

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toLocalDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toLocalDateKey(new Date());
}
