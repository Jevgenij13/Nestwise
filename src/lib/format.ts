import type { DateString, LeadDays } from '../types.ts';
import { parseDate } from './dates.ts';

/** Display strings from docs/DESIGN.md section 7 (dates, relative due text, reminder lead). */

function utcDate(s: DateString): Date {
  const parsed = parseDate(s);
  if (!parsed) throw new RangeError(`Invalid date: ${s}`);
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
}

/** "Tue 24 Nov" in lists. */
export function formatShortDate(s: DateString, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(utcDate(s));
}

/** "Tuesday 24 November" in sentences and headers. */
export function formatLongDate(s: DateString, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(utcDate(s));
}

/** "24 Nov 2026" for dates that can be in another year (end date, anchor). */
export function formatDateWithYear(s: DateString, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(utcDate(s));
}

const DAYS_AS_DAYS_LIMIT = 31;
const DAYS_PER_MONTH = 30.4375;

/** "Today", "Tomorrow", "In 3 days" up to 31 days, then "In 3 months" / "In 1 year" (DESIGN 5.2). Negative offsets are not expected for bills. */
export function relativeDueLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= DAYS_AS_DAYS_LIMIT) return `In ${days} days`;
  const months = Math.round(days / DAYS_PER_MONTH);
  if (months < 12) return `In ${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.round(days / 365.25);
  return `In ${years} ${years === 1 ? 'year' : 'years'}`;
}

export const LEAD_OPTIONS: readonly LeadDays[] = [0, 1, 3, 7];

/** Chip labels: "On the day", "1 day", "3 days", "1 week". */
export function leadChipLabel(lead: LeadDays): string {
  return lead === 0 ? 'On the day' : lead === 1 ? '1 day' : lead === 7 ? '1 week' : `${lead} days`;
}

/** Detail text: "On the day", "1 day before", "3 days before", "1 week before". */
export function leadSentence(lead: LeadDays): string {
  return lead === 0 ? 'On the day' : `${leadChipLabel(lead)} before`;
}

/** "3 days ago" style text for the backup nudge. */
export function daysAgoText(days: number): string {
  if (days <= 0) return 'today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
