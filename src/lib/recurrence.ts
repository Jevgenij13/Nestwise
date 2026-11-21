import type { Cadence, DateString, Repeat } from '../types.ts';
import { addDays, addMonths, compareDates, daysBetween, monthIndex } from './dates.ts';
import { divRoundHalfUp } from './money.ts';

/** Everything that can recur: bill cadences plus the chore-only "daily". */
export type RecurrenceKind = Cadence | Exclude<Repeat, 'none'>;

interface Step {
  days?: number;
  months?: number;
}

const STEPS: Record<RecurrenceKind, Step> = {
  daily: { days: 1 },
  weekly: { days: 7 },
  biweekly: { days: 14 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  yearly: { months: 12 },
};

/** The k-th occurrence from the anchor (k = 0 is the anchor). Month steps always count from the anchor's day, so clamping never drifts. */
export function occurrenceAt(anchor: DateString, kind: RecurrenceKind, k: number): DateString {
  const step = STEPS[kind];
  return step.days !== undefined ? addDays(anchor, k * step.days) : addMonths(anchor, k * (step.months ?? 0));
}

function indexOnOrAfter(anchor: DateString, kind: RecurrenceKind, from: DateString): number {
  if (compareDates(anchor, from) >= 0) return 0;
  const step = STEPS[kind];
  if (step.days !== undefined) return Math.ceil(daysBetween(anchor, from) / step.days);
  const stepMonths = step.months ?? 1;
  // The floor estimate never overshoots; the loop moves forward past clamped or earlier-in-month dates.
  let k = Math.max(0, Math.floor((monthIndex(from) - monthIndex(anchor)) / stepMonths));
  while (compareDates(occurrenceAt(anchor, kind, k), from) < 0) k++;
  return k;
}

/** First occurrence on or after `from`. An anchor in the future is itself the next occurrence. */
export function nextOccurrence(anchor: DateString, kind: RecurrenceKind, from: DateString): DateString {
  return occurrenceAt(anchor, kind, indexOnOrAfter(anchor, kind, from));
}

/** All occurrences with `from <= date <= to`, ascending. `limit` guards against huge windows. */
export function occurrencesInWindow(anchor: DateString, kind: RecurrenceKind, from: DateString, to: DateString, limit = 1000): DateString[] {
  const result: DateString[] = [];
  for (let k = indexOnOrAfter(anchor, kind, from); result.length < limit; k++) {
    const date = occurrenceAt(anchor, kind, k);
    if (compareDates(date, to) > 0) break;
    result.push(date);
  }
  return result;
}

/** One step forward from a date (chore repeats: previous due date + interval, AC-HOME-13). */
export function advanceOnce(date: DateString, kind: RecurrenceKind): DateString {
  return occurrenceAt(date, kind, 1);
}

/** Monthly factor in twelfths, so sums stay exact integers: weekly 52/12, biweekly 26/12, monthly 12/12, quarterly 4/12, yearly 1/12. */
export const MONTHLY_TWELFTHS: Record<Cadence, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** Monthly equivalent of one amount, rounded half up to the minor unit (per-row display). */
export function monthlyEquivalentMinor(amountMinor: number, cadence: Cadence): number {
  return divRoundHalfUp(amountMinor * MONTHLY_TWELFTHS[cadence], 12);
}
