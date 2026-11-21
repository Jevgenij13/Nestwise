import type { Bill, Cadence, DateString } from '../types.ts';
import { compareDates, daysBetween } from './dates.ts';
import { BILL_NAME_MAX } from './limits.ts';
import { divRoundHalfUp, formatMoney, parseAmount, type AmountError } from './money.ts';
import { err, ok, type Result } from './result.ts';
import { MONTHLY_TWELFTHS, nextOccurrence } from './recurrence.ts';

export type BillState = 'active' | 'paused' | 'ended' | 'deleted';

export function billState(bill: Bill, today: DateString): BillState {
  if (bill.deletedAt !== null) return 'deleted';
  if (bill.endDate !== undefined && compareDates(bill.endDate, today) < 0) return 'ended';
  return bill.status === 'paused' ? 'paused' : 'active';
}

/** Next due date: first occurrence on or after today (a bill due today is "Today", not past). */
export function nextDue(bill: Pick<Bill, 'anchorDate' | 'cadence'>, today: DateString): DateString {
  return nextOccurrence(bill.anchorDate, bill.cadence, today);
}

export interface BillRow {
  bill: Bill;
  nextDue: DateString;
  /** Days from today to the next due date; always >= 0 because dates roll forward. */
  daysUntil: number;
}

function toRow(bill: Bill, today: DateString): BillRow {
  const due = nextDue(bill, today);
  return { bill, nextDue: due, daysUntil: daysBetween(today, due) };
}

function byDueThenName(a: BillRow, b: BillRow): number {
  return compareDates(a.nextDue, b.nextDue) || a.bill.name.localeCompare(b.bill.name);
}

export interface GroupedBills {
  active: BillRow[];
  paused: BillRow[];
  ended: BillRow[];
}

/** Bills list groups (AC-BILL-3, 8, 15): active sorted by next due ascending, then Paused, then Ended. Deleted bills are dropped. */
export function groupBills(bills: Bill[], today: DateString): GroupedBills {
  const groups: GroupedBills = { active: [], paused: [], ended: [] };
  for (const bill of bills) {
    const state = billState(bill, today);
    if (state !== 'deleted') groups[state].push(toRow(bill, today));
  }
  groups.active.sort(byDueThenName);
  groups.paused.sort(byDueThenName);
  groups.ended.sort(byDueThenName);
  return groups;
}

/** Due soon (AC-BILL-9): active bills whose next due date is within their reminder lead. Lead 3: due in 3 days yes, in 4 no. */
export function dueSoonBills(bills: Bill[], today: DateString): BillRow[] {
  return groupBills(bills, today).active.filter((row) => row.daysUntil <= row.bill.leadDays);
}

/** Earliest upcoming active bill, for the "Nothing due soon" empty state (AC-APP-6). */
export function nextUpcomingBill(bills: Bill[], today: DateString): BillRow | null {
  return groupBills(bills, today).active[0] ?? null;
}

export interface BillTotals {
  /** Sum of unrounded monthly equivalents, rounded half up once. */
  monthlyMinor: number;
  /** Monthly total x 12 from the unrounded sum, rounded once (AC-BILL-6). */
  yearlyMinor: number;
}

/** Monthly and yearly totals over active bills (AC-BILL-5, 6). Exact integer twelfths, one rounding at the end. */
export function billTotals(bills: Bill[], today: DateString): BillTotals {
  let twelfths = 0;
  for (const bill of bills) {
    if (billState(bill, today) === 'active') twelfths += bill.amountMinor * MONTHLY_TWELFTHS[bill.cadence];
  }
  return { monthlyMinor: divRoundHalfUp(twelfths, 12), yearlyMinor: twelfths };
}

export const CADENCE_UNIT: Record<Cadence, string> = {
  weekly: 'week',
  biweekly: '2 weeks',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

/** Row amount text, e.g. "$9.99 / month". */
export function formatBillAmount(bill: Pick<Bill, 'amountMinor' | 'cadence'>, currency: string, locale?: string): string {
  return `${formatMoney(bill.amountMinor, currency, locale)} / ${CADENCE_UNIT[bill.cadence]}`;
}

export interface BillFormErrors {
  name?: 'required' | 'too-long';
  amount?: AmountError;
}

export interface ValidBillFields {
  name: string;
  amountMinor: number;
}

/** Validates the add/edit form (AC-BILL-1, 2). Save is enabled only when this returns ok. */
export function validateBillForm(input: { name: string; amount: string }, currency: string): Result<ValidBillFields, BillFormErrors> {
  const errors: BillFormErrors = {};
  const name = input.name.trim();
  if (name === '') errors.name = 'required';
  else if (name.length > BILL_NAME_MAX) errors.name = 'too-long';
  const amount = parseAmount(input.amount, currency);
  if (!amount.ok) errors.amount = amount.error;
  if (errors.name || errors.amount || !amount.ok) return err(errors);
  return ok({ name, amountMinor: amount.value });
}
