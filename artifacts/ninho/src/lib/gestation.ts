const DAY_IN_MS = 1000 * 60 * 60 * 24;

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  // Date silently normalizes impossible calendar dates (for example,
  // 2026-02-31), so compare the parts before trusting the result.
  const [year, month, day] = value.split("-").map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;

  return date;
}

/**
 * Derives the current gestational week from an expected due date.
 * Invalid dates are treated as unavailable and valid dates are kept inside
 * the useful display range rather than producing surprising negative values.
 */
export function calcGestationalWeek(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = parseIsoDate(dueDate);
  if (!due) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const daysToGo = (due.getTime() - today.getTime()) / DAY_IN_MS;
  const week = Math.round(40 - daysToGo / 7);
  return Math.max(1, Math.min(44, week));
}