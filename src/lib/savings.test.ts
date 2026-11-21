import { describe, expect, it } from 'vitest';
import { formatMonthYear } from './dates.ts';
import { defaultScenarios, formatDuration, monthsToGoal, parseRatePct, requiredMonthly, scenarioResults, type GoalInput } from './savings.ts';

const TODAY = '2026-11-21';
const base: GoalInput = { goalMinor: 500000, savedMinor: 100000, annualRatePct: 0 };
const months = (input: GoalInput, monthly: number) => {
  const r = monthsToGoal(input, monthly);
  return r.kind === 'ok' ? r.months : r.kind;
};

describe('monthsToGoal at 0% (AC-GOAL-3)', () => {
  it('goal 5,000, saved 1,000 gives 40 / 20 / 16 / 10 months at 100 / 200 / 250 / 400', () => {
    expect([10000, 20000, 25000, 40000].map((c) => months(base, c))).toEqual([40, 20, 16, 10]);
  });
  it('rounds up partial months', () => {
    expect(months(base, 30000)).toBe(14); // 4000 / 300 = 13.33
    expect(months(base, 399999)).toBe(2);
    expect(months(base, 400000)).toBe(1);
  });
});

describe('scenarioResults (AC-GOAL-3 target months)', () => {
  it('gives Mar 2030 / Jul 2028 / Mar 2028 / Sep 2027', () => {
    const rows = scenarioResults(base, [10000, 20000, 25000, 40000], TODAY);
    expect(rows.map((r) => r.targetDate)).toEqual(['2030-03-21', '2028-07-21', '2028-03-21', '2027-09-21']);
    expect(rows.map((r) => formatMonthYear(r.targetDate ?? '', 'en-US'))).toEqual(['Mar 2030', 'Jul 2028', 'Mar 2028', 'Sep 2027']);
  });
  it('omits the target date when there is no result', () => {
    const [row] = scenarioResults(base, [0], TODAY);
    expect(row).toEqual({ monthlyMinor: 0, result: { kind: 'no-amount' } });
  });
  it('clamps target dates at month ends', () => {
    const [row] = scenarioResults(base, [400000], '2026-01-31');
    expect(row?.targetDate).toBe('2026-02-28');
  });
});

describe('monthsToGoal with interest (AC-GOAL-4)', () => {
  const at5: GoalInput = { ...base, annualRatePct: 5 };
  it('5% gives 36 months at 100/month and 19 at 200/month', () => {
    expect(months(at5, 10000)).toBe(36);
    expect(months(at5, 20000)).toBe(19);
  });
  it('interest never takes longer than 0%', () => {
    for (const c of [5000, 10000, 20000, 25000, 40000]) {
      expect(months(at5, c) as number).toBeLessThanOrEqual(months(base, c) as number);
    }
  });
  it('satisfies the closed-form definition: smallest n with S(1+i)^n + c((1+i)^n - 1)/i >= G', () => {
    const i = 0.05 / 12;
    const value = (n: number, c: number) => 100000 * (1 + i) ** n + (c * ((1 + i) ** n - 1)) / i;
    for (const c of [10000, 20000, 25000, 40000, 7777]) {
      const n = months(at5, c) as number;
      expect(value(n, c)).toBeGreaterThanOrEqual(500000 - 1e-6);
      expect(value(n - 1, c)).toBeLessThan(500000);
    }
  });
  it('works at the 20% upper bound', () => {
    expect(months({ ...base, annualRatePct: 20 }, 10000) as number).toBeLessThan(36);
  });
});

describe('monthsToGoal edge cases (AC-GOAL-5)', () => {
  it('saved >= goal is already reached', () => {
    expect(months({ goalMinor: 100000, savedMinor: 100000, annualRatePct: 0 }, 5000)).toBe('reached');
    expect(months({ goalMinor: 100000, savedMinor: 150000, annualRatePct: 0 }, 0)).toBe('reached');
  });
  it('monthly 0, empty (NaN) or negative asks for an amount, never Infinity', () => {
    expect(months(base, 0)).toBe('no-amount');
    expect(months(base, Number.NaN)).toBe('no-amount');
    expect(months(base, -5)).toBe('no-amount');
  });
  it('goal 0, empty or NaN shows no results', () => {
    expect(months({ ...base, goalMinor: 0 }, 10000)).toBe('no-goal');
    expect(months({ ...base, goalMinor: Number.NaN }, 10000)).toBe('no-goal');
  });
  it('more than 1,200 months is "too long"; exactly 1,200 is fine', () => {
    const g = (goalMinor: number): GoalInput => ({ goalMinor, savedMinor: 0, annualRatePct: 0 });
    expect(months(g(120000), 100)).toBe(1200);
    expect(months(g(120001), 100)).toBe('too-long');
    expect(months(g(100000000), 100)).toBe('too-long');
  });
  it('too long also applies with interest', () => {
    expect(months({ goalMinor: 100000000, savedMinor: 0, annualRatePct: 1 }, 100)).toBe('too-long');
  });
});

describe('formatDuration', () => {
  it('formats years and months', () => {
    expect(formatDuration(40)).toBe('3 yrs 4 mo');
    expect(formatDuration(20)).toBe('1 yr 8 mo');
    expect(formatDuration(16)).toBe('1 yr 4 mo');
    expect(formatDuration(10)).toBe('10 mo');
    expect(formatDuration(12)).toBe('1 yr');
    expect(formatDuration(24)).toBe('2 yrs');
    expect(formatDuration(1)).toBe('1 mo');
  });
});

describe('defaultScenarios (AC-GOAL-2)', () => {
  it('is 0.5x, 1x, 1.5x, 2x of the entered amount', () => {
    expect(defaultScenarios(20000, 100)).toEqual([10000, 20000, 30000, 40000]);
  });
  it('rounds each to a whole currency unit, half up', () => {
    expect(defaultScenarios(25050, 100)).toEqual([12500, 25100, 37600, 50100]);
  });
  it('has a minimum of one unit', () => {
    expect(defaultScenarios(10, 100)).toEqual([100, 100, 100, 100]);
    expect(defaultScenarios(100, 100)).toEqual([100, 100, 200, 200]);
  });
  it('works for 0-decimal currencies', () => {
    expect(defaultScenarios(1000, 1)).toEqual([500, 1000, 1500, 2000]);
  });
});

describe('requiredMonthly (AC-GOAL-6, 7)', () => {
  it('goal 5,000, saved 1,000, 12 months gives 333.34', () => {
    const r = requiredMonthly(base, '2027-11-21', TODAY);
    expect(r).toEqual({ ok: true, value: { kind: 'ok', months: 12, monthlyMinor: 33334 } });
  });
  it('rounds the month count up for a date a day past the month boundary', () => {
    const r = requiredMonthly(base, '2027-11-22', TODAY);
    expect(r).toEqual({ ok: true, value: { kind: 'ok', months: 13, monthlyMinor: 30770 } }); // 400000 / 13 = 30769.2
  });
  it('rounding up guarantees the goal is reached, and one minor unit less would not', () => {
    for (const [rate, target] of [[0, '2027-11-21'], [0, '2029-03-15'], [5, '2029-11-21'], [3.5, '2028-01-31'], [20, '2031-06-01']] as const) {
      const input = { ...base, annualRatePct: rate };
      const r = requiredMonthly(input, target, TODAY);
      expect(r.ok).toBe(true);
      if (!r.ok || r.value.kind !== 'ok') continue;
      const reach = monthsToGoal(input, r.value.monthlyMinor);
      expect(reach.kind === 'ok' && reach.months <= r.value.months).toBe(true);
      const short = monthsToGoal(input, r.value.monthlyMinor - 1);
      expect(short.kind === 'ok' && short.months <= r.value.months).toBe(false);
    }
  });
  it('same-day or past date is an inline error with no result', () => {
    expect(requiredMonthly(base, TODAY, TODAY)).toEqual({ ok: false, error: 'not-future' });
    expect(requiredMonthly(base, '2026-11-20', TODAY)).toEqual({ ok: false, error: 'not-future' });
  });
  it('saved >= goal shows "Goal already reached"', () => {
    expect(requiredMonthly({ ...base, savedMinor: 500000 }, '2027-11-21', TODAY)).toEqual({ ok: true, value: { kind: 'reached' } });
  });
  it('allows at most 50 years out', () => {
    expect(requiredMonthly(base, '2076-11-21', TODAY).ok).toBe(true);
    expect(requiredMonthly(base, '2076-11-22', TODAY)).toEqual({ ok: false, error: 'too-far' });
  });
  it('rejects a missing goal and a malformed date', () => {
    expect(requiredMonthly({ ...base, goalMinor: 0 }, '2027-11-21', TODAY)).toEqual({ ok: false, error: 'no-goal' });
    expect(requiredMonthly(base, '', TODAY)).toEqual({ ok: false, error: 'invalid-date' });
  });
  it('reports when interest alone covers the goal', () => {
    const r = requiredMonthly({ goalMinor: 500000, savedMinor: 490000, annualRatePct: 20 }, '2027-11-21', TODAY);
    expect(r).toEqual({ ok: true, value: { kind: 'covered-by-interest', months: 12 } });
  });
});

describe('parseRatePct (AC-GOAL-4)', () => {
  const rate = (s: string) => {
    const r = parseRatePct(s);
    return r.ok ? r.value : r.error;
  };
  it('defaults to 0 and accepts 0 to 20 with up to 2 decimals', () => {
    expect(rate('')).toBe(0);
    expect(rate('0')).toBe(0);
    expect(rate('5')).toBe(5);
    expect(rate('5.25')).toBe(5.25);
    expect(rate('5,5')).toBe(5.5);
    expect(rate('20')).toBe(20);
    expect(rate('.5')).toBe(0.5);
  });
  it('rejects out-of-range, too precise and non-numeric input', () => {
    expect(rate('20.01')).toBe('out-of-range');
    expect(rate('21')).toBe('out-of-range');
    expect(rate('5.123')).toBe('too-many-decimals');
    expect(rate('abc')).toBe('invalid');
    expect(rate('-1')).toBe('invalid');
    expect(rate('1.2.3')).toBe('invalid');
    expect(rate('.')).toBe('invalid');
  });
});
