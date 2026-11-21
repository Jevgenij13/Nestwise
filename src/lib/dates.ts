import type { DateString } from '../types.ts';

/**
 * Local calendar-date helpers (D9). Dates are `YYYY-MM-DD` strings with no time zone.
 * All arithmetic goes through UTC day numbers, so DST changes can never shift a date.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface YMD {
  y: number;
  m: number;
  d: number;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function parseDate(s: string): YMD | null {
  const match = DATE_RE.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function isValidDate(s: string): boolean {
  return parseDate(s) !== null;
}

function mustParse(s: string): YMD {
  const parsed = parseDate(s);
  if (!parsed) throw new RangeError(`Invalid date: ${s}`);
  return parsed;
}

export function formatDate(y: number, m: number, d: number): DateString {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Today's date in the device's local time zone. */
export function localToday(now: Date = new Date()): DateString {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function toDayNumber({ y, m, d }: YMD): number {
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

function fromDayNumber(n: number): DateString {
  const date = new Date(n * MS_PER_DAY);
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDays(s: DateString, days: number): DateString {
  return fromDayNumber(toDayNumber(mustParse(s)) + days);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: DateString, b: DateString): number {
  return toDayNumber(mustParse(b)) - toDayNumber(mustParse(a));
}

/** Month count since year 0, so month differences are plain subtraction. */
export function monthIndex(s: DateString): number {
  const { y, m } = mustParse(s);
  return y * 12 + (m - 1);
}

/**
 * Add whole months, keeping `anchorDay` (default: the date's own day) and clamping to the month end:
 * addMonths("2026-01-31", 1) is 2026-02-28; addMonths("2026-01-31", 2) is 2026-03-31.
 */
export function addMonths(s: DateString, months: number, anchorDay?: number): DateString {
  const { y, m, d } = mustParse(s);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  return formatDate(ny, nm, Math.min(anchorDay ?? d, daysInMonth(ny, nm)));
}

/**
 * Whole months from `from` to `to`, rounded up: the smallest n >= 0 with addMonths(from, n) >= to.
 * Consistent with the savings calculator's "today + n months" target dates (PRD section 7).
 */
export function monthsUntilCeil(from: DateString, to: DateString): number {
  if (compareDates(to, from) <= 0) return 0;
  let n = Math.max(0, monthIndex(to) - monthIndex(from));
  while (compareDates(addMonths(from, n), to) < 0) n++;
  while (n > 0 && compareDates(addMonths(from, n - 1), to) >= 0) n--;
  return n;
}

/** "Mar 2030" in the given (or device) locale. */
export function formatMonthYear(s: DateString, locale?: string): string {
  const { y, m } = mustParse(s);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "21 Nov 2026" style, locale-dependent. */
export function formatDateLong(s: DateString, locale?: string): string {
  const { y, m, d } = mustParse(s);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Relative day text for a signed day offset from today: "Today", "Tomorrow", "in 3 days", "2 days overdue". */
export function relativeDayText(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `in ${days} days`;
  return days === -1 ? '1 day overdue' : `${-days} days overdue`;
}
