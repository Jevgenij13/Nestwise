import { describe, expect, it } from 'vitest';
import { billState, billTotals, dueSoonBills, formatBillAmount, groupBills, nextDue, nextUpcomingBill, validateBillForm } from './bills.ts';
import { formatMoney } from './money.ts';
import { makeBill } from './test-fixtures.ts';

const TODAY = '2026-11-21';

describe('nextDue (AC-BILL-4)', () => {
  it('monthly anchor 2026-01-31 gives 2026-11-30, and 2027-02-28 on 2027-02-01', () => {
    const bill = makeBill('a', { cadence: 'monthly', anchorDate: '2026-01-31' });
    expect(nextDue(bill, TODAY)).toBe('2026-11-30');
    expect(nextDue(bill, '2027-02-01')).toBe('2027-02-28');
  });
  it('yearly anchor 2024-02-29 gives 2027-02-28', () => {
    expect(nextDue(makeBill('a', { cadence: 'yearly', anchorDate: '2024-02-29' }), TODAY)).toBe('2027-02-28');
  });
  it('biweekly anchor 2026-11-14 gives 2026-11-28', () => {
    expect(nextDue(makeBill('a', { cadence: 'biweekly', anchorDate: '2026-11-14' }), TODAY)).toBe('2026-11-28');
  });
  it('quarterly anchor 2026-08-21 gives today', () => {
    expect(nextDue(makeBill('a', { cadence: 'quarterly', anchorDate: '2026-08-21' }), TODAY)).toBe('2026-11-21');
  });
  it('rolls forward on its own as time passes (no "mark paid")', () => {
    const bill = makeBill('a', { cadence: 'monthly', anchorDate: '2026-11-21' });
    expect(nextDue(bill, '2026-11-21')).toBe('2026-11-21');
    expect(nextDue(bill, '2026-11-22')).toBe('2026-12-21');
  });
});

describe('billState', () => {
  it('derives active, paused, ended and deleted', () => {
    expect(billState(makeBill('a'), TODAY)).toBe('active');
    expect(billState(makeBill('a', { status: 'paused' }), TODAY)).toBe('paused');
    expect(billState(makeBill('a', { endDate: '2026-11-20' }), TODAY)).toBe('ended');
    expect(billState(makeBill('a', { endDate: '2026-11-21' }), TODAY)).toBe('active');
    expect(billState(makeBill('a', { deletedAt: '2026-11-01T00:00:00.000Z' }), TODAY)).toBe('deleted');
  });
});

describe('billTotals (AC-BILL-5, 6)', () => {
  const set = [
    makeBill('w', { cadence: 'weekly', amountMinor: 1000 }),
    makeBill('b', { cadence: 'biweekly', amountMinor: 2500 }),
    makeBill('q', { cadence: 'quarterly', amountMinor: 3000 }),
    makeBill('y', { cadence: 'yearly', amountMinor: 12000 }),
    makeBill('m', { cadence: 'monthly', amountMinor: 999 }),
  ];
  it('sums to 127.49 per month and 1,529.88 per year', () => {
    const totals = billTotals(set, TODAY);
    expect(totals.monthlyMinor).toBe(12749);
    expect(totals.yearlyMinor).toBe(152988);
    expect(formatMoney(totals.monthlyMinor, 'USD', 'en-US')).toBe('$127.49');
    expect(formatMoney(totals.yearlyMinor, 'USD', 'en-US')).toBe('$1,529.88');
  });
  it('is 0, not blank, for no bills (AC-BILL-10)', () => {
    expect(billTotals([], TODAY)).toEqual({ monthlyMinor: 0, yearlyMinor: 0 });
  });
  it('excludes paused, ended and deleted bills', () => {
    const extra = [
      makeBill('p', { status: 'paused', amountMinor: 50000 }),
      makeBill('e', { endDate: '2026-01-01', amountMinor: 50000 }),
      makeBill('d', { deletedAt: '2026-11-01T00:00:00.000Z', amountMinor: 50000 }),
    ];
    expect(billTotals([...set, ...extra], TODAY).monthlyMinor).toBe(12749);
  });
  it('rounds once on the unrounded sum, not per row', () => {
    const three = [1, 2, 3].map((i) => makeBill(`w${i}`, { cadence: 'weekly', amountMinor: 1 }));
    // Each row alone rounds to 4 (sum of rows 12); exact total is 3 x 52/12 = 13.
    expect(billTotals(three, TODAY).monthlyMinor).toBe(13);
  });
  it('yearly is the unrounded monthly sum x 12', () => {
    const one = [makeBill('w', { cadence: 'weekly', amountMinor: 1 })];
    expect(billTotals(one, TODAY)).toEqual({ monthlyMinor: 4, yearlyMinor: 52 });
  });
});

describe('dueSoonBills (AC-BILL-9)', () => {
  it('lead 3: due 2026-11-24 appears on 2026-11-21, due 2026-11-25 does not', () => {
    const bills = [makeBill('in3', { anchorDate: '2026-11-24', cadence: 'yearly' }), makeBill('in4', { anchorDate: '2026-11-25', cadence: 'yearly' })];
    expect(dueSoonBills(bills, TODAY).map((r) => r.bill.id)).toEqual(['in3']);
  });
  it('lead 0 shows only bills due today; lead 7 reaches a week out', () => {
    const bills = [
      makeBill('today0', { anchorDate: TODAY, leadDays: 0, cadence: 'yearly' }),
      makeBill('tomorrow0', { anchorDate: '2026-11-22', leadDays: 0, cadence: 'yearly' }),
      makeBill('week7', { anchorDate: '2026-11-28', leadDays: 7, cadence: 'yearly' }),
      makeBill('week8', { anchorDate: '2026-11-29', leadDays: 7, cadence: 'yearly' }),
      makeBill('lead1', { anchorDate: '2026-11-22', leadDays: 1, cadence: 'yearly' }),
    ];
    expect(dueSoonBills(bills, TODAY).map((r) => r.bill.id)).toEqual(['today0', 'lead1', 'week7']);
  });
  it('excludes paused, ended and deleted bills', () => {
    const bills = [
      makeBill('paused', { anchorDate: TODAY, status: 'paused' }),
      makeBill('ended', { anchorDate: TODAY, endDate: '2026-11-01' }),
      makeBill('gone', { anchorDate: TODAY, deletedAt: '2026-11-20T00:00:00.000Z' }),
    ];
    expect(dueSoonBills(bills, TODAY)).toEqual([]);
  });
  it('reports days until due for relative text', () => {
    const [row] = dueSoonBills([makeBill('a', { anchorDate: '2026-11-23', cadence: 'yearly' })], TODAY);
    expect(row?.daysUntil).toBe(2);
    expect(row?.nextDue).toBe('2026-11-23');
  });
  it('a monthly bill due today is due soon, never overdue', () => {
    const rows = dueSoonBills([makeBill('a', { anchorDate: '2026-10-21' })], TODAY);
    expect(rows[0]?.daysUntil).toBe(0);
  });
});

describe('groupBills (AC-BILL-3, 8)', () => {
  it('sorts active by next due ascending, name as tiebreak, and separates paused/ended/deleted', () => {
    const bills = [
      makeBill('late', { name: 'Late', anchorDate: '2026-12-25', cadence: 'yearly' }),
      makeBill('b', { name: 'Bravo', anchorDate: '2026-11-25', cadence: 'yearly' }),
      makeBill('a', { name: 'Alpha', anchorDate: '2026-11-25', cadence: 'yearly' }),
      makeBill('p', { name: 'Paused', status: 'paused' }),
      makeBill('e', { name: 'Ended', endDate: '2026-01-01' }),
      makeBill('d', { name: 'Deleted', deletedAt: '2026-11-01T00:00:00.000Z' }),
    ];
    const groups = groupBills(bills, TODAY);
    expect(groups.active.map((r) => r.bill.id)).toEqual(['a', 'b', 'late']);
    expect(groups.paused.map((r) => r.bill.id)).toEqual(['p']);
    expect(groups.ended.map((r) => r.bill.id)).toEqual(['e']);
  });
  it('nextUpcomingBill picks the earliest active bill, or null', () => {
    expect(nextUpcomingBill([], TODAY)).toBeNull();
    const bills = [makeBill('x', { anchorDate: '2026-12-01', cadence: 'yearly' }), makeBill('y', { anchorDate: '2026-11-30', cadence: 'yearly' })];
    expect(nextUpcomingBill(bills, TODAY)?.bill.id).toBe('y');
  });
});

describe('formatBillAmount (AC-BILL-3)', () => {
  it('shows amount with cadence label', () => {
    expect(formatBillAmount({ amountMinor: 999, cadence: 'monthly' }, 'USD', 'en-US')).toBe('$9.99 / month');
    expect(formatBillAmount({ amountMinor: 1000, cadence: 'weekly' }, 'USD', 'en-US')).toBe('$10.00 / week');
    expect(formatBillAmount({ amountMinor: 2500, cadence: 'biweekly' }, 'USD', 'en-US')).toBe('$25.00 / 2 weeks');
    expect(formatBillAmount({ amountMinor: 3000, cadence: 'quarterly' }, 'USD', 'en-US')).toBe('$30.00 / quarter');
    expect(formatBillAmount({ amountMinor: 12000, cadence: 'yearly' }, 'USD', 'en-US')).toBe('$120.00 / year');
  });
});

describe('validateBillForm (AC-BILL-1, 2)', () => {
  it('accepts a valid form and trims the name', () => {
    expect(validateBillForm({ name: '  Netflix ', amount: '12,5' }, 'USD')).toEqual({ ok: true, value: { name: 'Netflix', amountMinor: 1250 } });
  });
  it('requires a name of 1 to 60 characters', () => {
    expect(validateBillForm({ name: '   ', amount: '5' }, 'USD')).toEqual({ ok: false, error: { name: 'required' } });
    expect(validateBillForm({ name: 'x'.repeat(60), amount: '5' }, 'USD').ok).toBe(true);
    expect(validateBillForm({ name: 'x'.repeat(61), amount: '5' }, 'USD')).toEqual({ ok: false, error: { name: 'too-long' } });
  });
  it('rejects letters, zero and negative amounts with inline errors', () => {
    expect(validateBillForm({ name: 'a', amount: 'abc' }, 'USD')).toEqual({ ok: false, error: { amount: 'invalid' } });
    expect(validateBillForm({ name: 'a', amount: '0' }, 'USD')).toEqual({ ok: false, error: { amount: 'zero' } });
    expect(validateBillForm({ name: 'a', amount: '-3' }, 'USD')).toEqual({ ok: false, error: { amount: 'negative' } });
  });
  it('reports both errors at once', () => {
    expect(validateBillForm({ name: '', amount: '' }, 'USD')).toEqual({ ok: false, error: { name: 'required', amount: 'empty' } });
  });
});
