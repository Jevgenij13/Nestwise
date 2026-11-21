import { describe, expect, it } from 'vitest';
import {
  addToSavings, amountText, createGoal, editGoal, emptyGoalForm, evaluateGoalForm, formFromGoal, goalFieldsFromForm, goalProgressPct, resetScenarios,
  summarizeGoal, targetDateBounds, withAddedScenario, withMonthly, withoutScenario, withScenario, type GoalForm,
} from './goalForm.ts';
import { nextScenario } from './savings.ts';
import { makeGoal } from './test-fixtures.ts';

const TODAY = '2026-11-21';
const form = (patch: Partial<GoalForm> = {}): GoalForm => ({ ...emptyGoalForm(), goal: '5000', saved: '1000', ...patch });

describe('scenario regeneration rule (DESIGN 5.7)', () => {
  it('typing a monthly amount generates 0.5x, 1x, 1.5x, 2x, each in whole units', () => {
    expect(withMonthly(form(), '200', 'EUR').scenarios).toEqual(['100', '200', '300', '400']);
    expect(withMonthly(form(), '9', 'EUR').scenarios).toEqual(['5', '9', '14', '18']);
    expect(withMonthly(form(), '1', 'EUR').scenarios).toEqual(['1', '1', '2', '2']);
    expect(withMonthly(form(), '', 'EUR').scenarios).toEqual([]);
    expect(withMonthly(form(), 'abc', 'EUR').scenarios).toEqual([]);
  });

  it('keeps following the monthly field until a card is edited by hand, then stops until Reset', () => {
    let f = withMonthly(form(), '200', 'EUR');
    f = withScenario(f, 2, '250');
    expect(f.scenariosEdited).toBe(true);
    f = withMonthly(f, '300', 'EUR');
    expect(f.scenarios).toEqual(['100', '200', '250', '400']);
    expect(f.monthly).toBe('300');
    f = resetScenarios(f, 'EUR');
    expect(f.scenarios).toEqual(['150', '300', '450', '600']);
    expect(f.scenariosEdited).toBe(false);
  });

  it('adds and removes cards within 1 to 4 and marks them as edited', () => {
    let f = withMonthly(form(), '200', 'EUR');
    expect(withAddedScenario(f, 500, 'EUR')).toBe(f);
    f = withoutScenario(f, 0);
    expect(f.scenarios).toEqual(['200', '300', '400']);
    expect(f.scenariosEdited).toBe(true);
    f = withAddedScenario(f, 20000, 'EUR');
    expect(f.scenarios).toHaveLength(4);
  });

  it('suggests 1.5x the largest card for a new scenario, at least one unit more', () => {
    expect(nextScenario([10000, 20000], 100)).toBe(30000);
    expect(nextScenario([100], 100)).toBe(200);
    expect(nextScenario([], 100)).toBe(100);
  });
});

describe('evaluateGoalForm (AC-GOAL-1 to 7)', () => {
  const withCards = (cards: string[], patch: Partial<GoalForm> = {}) => form({ scenarios: cards, scenariosEdited: true, ...patch });

  it('AC-GOAL-3: 5,000 goal, 1,000 saved, 100 / 200 / 250 / 400 give 40 / 20 / 16 / 10 months', () => {
    const e = evaluateGoalForm(withCards(['100', '200', '250', '400']), 'EUR', TODAY);
    expect(e.status).toBe('ready');
    expect(e.scenarios.map((s) => (s.result?.result.kind === 'ok' ? s.result.result.months : null))).toEqual([40, 20, 16, 10]);
    expect(e.scenarios.map((s) => s.result?.targetDate)).toEqual(['2030-03-21', '2028-07-21', '2028-03-21', '2027-09-21']);
    expect(e.fastest).toEqual([3]);
  });

  it('AC-GOAL-4: 5% gives 36 months at 100 and 19 at 200', () => {
    const e = evaluateGoalForm(withCards(['100', '200'], { rate: '5' }), 'EUR', TODAY);
    expect(e.scenarios.map((s) => (s.result?.result.kind === 'ok' ? s.result.result.months : null))).toEqual([36, 19]);
  });

  it('AC-GOAL-5: no goal, reached, empty or zero monthly, and more than 100 years', () => {
    expect(evaluateGoalForm(form({ goal: '' }), 'EUR', TODAY).status).toBe('needs-goal');
    expect(evaluateGoalForm(form({ goal: '0' }), 'EUR', TODAY).status).toBe('needs-goal');
    expect(evaluateGoalForm(form({ goal: '0' }), 'EUR', TODAY).goalError).toBeUndefined();
    expect(evaluateGoalForm(form({ saved: '5000' }), 'EUR', TODAY).status).toBe('reached');
    expect(evaluateGoalForm(form({ saved: '6000' }), 'EUR', TODAY).status).toBe('reached');
    const none = evaluateGoalForm(withCards(['0', '']), 'EUR', TODAY);
    expect(none.scenarios.map((s) => s.error)).toEqual(['zero', 'empty']);
    expect(none.scenarios.every((s) => s.result === undefined)).toBe(true);
    const long = evaluateGoalForm(withCards(['1']), 'EUR', TODAY);
    expect(long.scenarios[0]?.result?.result.kind).toBe('too-long');
    expect(long.fastest).toEqual([]);
  });

  it('flags invalid fields and shows no results', () => {
    expect(evaluateGoalForm(form({ goal: 'abc' }), 'EUR', TODAY)).toMatchObject({ status: 'invalid', goalError: 'invalid' });
    expect(evaluateGoalForm(form({ saved: '-5' }), 'EUR', TODAY)).toMatchObject({ status: 'invalid', savedError: 'negative' });
    expect(evaluateGoalForm(form({ rate: '21' }), 'EUR', TODAY)).toMatchObject({ status: 'invalid', rateError: 'out-of-range' });
    expect(evaluateGoalForm(form({ rate: '1.234' }), 'EUR', TODAY)).toMatchObject({ rateError: 'too-many-decimals' });
  });

  it('AC-GOAL-6: reverse mode, 12 months gives 333.34 per month (rounded up)', () => {
    const e = evaluateGoalForm(form({ mode: 'by-date', targetDate: '2027-11-21' }), 'EUR', TODAY);
    expect(e.required).toEqual({ kind: 'ok', value: { kind: 'ok', months: 12, monthlyMinor: 33334 } });
  });

  it('AC-GOAL-7: a past or same-day date is an error, more than 50 years too, empty prompts, saved >= goal is reached', () => {
    const at = (targetDate: string, patch: Partial<GoalForm> = {}) => evaluateGoalForm(form({ mode: 'by-date', targetDate, ...patch }), 'EUR', TODAY);
    expect(at('2026-11-21').required).toEqual({ kind: 'error', error: 'not-future' });
    expect(at('2026-11-20').required).toEqual({ kind: 'error', error: 'not-future' });
    expect(at('2077-01-01').required).toEqual({ kind: 'error', error: 'too-far' });
    expect(at('').required).toEqual({ kind: 'empty' });
    expect(at('2027-11-21', { saved: '5000' }).status).toBe('reached');
  });

  it('reverse mode with interest can be covered by interest alone', () => {
    const e = evaluateGoalForm(form({ mode: 'by-date', targetDate: '2036-11-21', goal: '1500', saved: '1000', rate: '10' }), 'EUR', TODAY);
    expect(e.required).toEqual({ kind: 'ok', value: { kind: 'covered-by-interest', months: 120 } });
  });

  it('bounds the date picker from tomorrow to 50 years ahead', () => {
    expect(targetDateBounds(TODAY)).toEqual({ min: '2026-11-22', max: '2076-11-21' });
  });

  it('works for a currency without decimals', () => {
    const e = evaluateGoalForm(form({ goal: '100000', saved: '0', scenarios: ['10000'], scenariosEdited: true }), 'JPY', TODAY);
    expect(e.scenarios[0]?.result?.result).toEqual({ kind: 'ok', months: 10 });
    expect(withMonthly(emptyGoalForm(), '5000', 'JPY').scenarios).toEqual(['2500', '5000', '7500', '10000']);
  });
});

describe('saving a goal (AC-GOAL-9)', () => {
  it('builds fields from valid input and drops an empty name', () => {
    const f = withScenario(withMonthly(form({ name: '  New laptop ' }), '200', 'EUR'), 2, '250');
    const r = goalFieldsFromForm(f, 'EUR', TODAY);
    expect(r).toEqual({ ok: true, value: { name: 'New laptop', targetMinor: 500000, currentMinor: 100000, scenariosMinor: [10000, 20000, 25000, 40000], annualRatePct: 0 } });
    const noName = goalFieldsFromForm(withMonthly(form(), '200', 'EUR'), 'EUR', TODAY);
    expect(noName.ok && 'name' in noName.value).toBe(false);
  });

  it('keeps the date in by-date mode only', () => {
    const base = withMonthly(form(), '200', 'EUR');
    expect(goalFieldsFromForm({ ...base, mode: 'by-date', targetDate: '2027-11-21' }, 'EUR', TODAY)).toMatchObject({ ok: true, value: { targetDate: '2027-11-21' } });
    const how = goalFieldsFromForm({ ...base, mode: 'how-long', targetDate: '2027-11-21' }, 'EUR', TODAY);
    expect(how.ok && 'targetDate' in how.value).toBe(false);
  });

  it('by-date with no cards stores scenarios derived from the required amount', () => {
    const r = goalFieldsFromForm(form({ mode: 'by-date', targetDate: '2027-11-21' }), 'EUR', TODAY);
    expect(r).toMatchObject({ ok: true, value: { scenariosMinor: [16700, 33300, 50000, 66700], targetDate: '2027-11-21' } });
  });

  it('refuses invalid or incomplete input', () => {
    const base = withMonthly(form(), '200', 'EUR');
    expect(goalFieldsFromForm(form({ goal: '' }), 'EUR', TODAY)).toEqual({ ok: false, error: 'needs-goal' });
    expect(goalFieldsFromForm({ ...base, rate: '99' }, 'EUR', TODAY)).toEqual({ ok: false, error: 'invalid' });
    expect(goalFieldsFromForm(form(), 'EUR', TODAY)).toEqual({ ok: false, error: 'no-scenario' });
    expect(goalFieldsFromForm(withScenario(base, 1, 'x'), 'EUR', TODAY)).toEqual({ ok: false, error: 'bad-scenario' });
    expect(goalFieldsFromForm({ ...base, mode: 'by-date', targetDate: '2020-01-01' }, 'EUR', TODAY)).toEqual({ ok: false, error: 'by-date-needed' });
  });

  it('round-trips through formFromGoal and detects hand-edited scenarios', () => {
    const generated = makeGoal('g', { scenariosMinor: [10000, 20000, 30000, 40000], annualRatePct: 2.5 });
    const f1 = formFromGoal(generated, 'EUR');
    expect(f1).toMatchObject({ goal: '5000', saved: '1000', rate: '2.5', monthly: '200', scenarios: ['100', '200', '300', '400'], scenariosEdited: false, mode: 'how-long' });
    const custom = makeGoal('g', { scenariosMinor: [10000, 20000, 25000, 40000], targetDate: '2028-06-01' });
    expect(formFromGoal(custom, 'EUR')).toMatchObject({ scenariosEdited: true, mode: 'by-date', targetDate: '2028-06-01' });
  });

  it('creates and edits goals, clearing a removed name or date', () => {
    const fields = { targetMinor: 1000, currentMinor: 0, scenariosMinor: [100], annualRatePct: 0 };
    const created = createGoal({ ...fields, name: 'A', targetDate: '2027-01-01' }, 'id', '2026-11-21T00:00:00.000Z');
    expect(created).toMatchObject({ id: 'id', deletedAt: null, name: 'A' });
    const edited = editGoal(created, fields, '2026-11-22T00:00:00.000Z');
    expect(edited).not.toHaveProperty('name');
    expect(edited).not.toHaveProperty('targetDate');
    expect(edited.updatedAt).toBe('2026-11-22T00:00:00.000Z');
    expect(edited.createdAt).toBe('2026-11-21T00:00:00.000Z');
  });

  it('formats amounts for inputs without trailing zeros', () => {
    expect(amountText(10000, 'EUR')).toBe('100');
    expect(amountText(9950, 'EUR')).toBe('99.50');
    expect(amountText(500, 'JPY')).toBe('500');
  });
});

describe('add to savings and progress (AC-GOAL-9, 11)', () => {
  it('adds to the stored amount and rejects zero or overflow', () => {
    expect(addToSavings(100000, 20000)).toBe(120000);
    expect(addToSavings(100000, 0)).toBeNull();
    expect(addToSavings(1_000_000_000_000, 1)).toBeNull();
  });

  it('progress is the whole percent, capped at 100', () => {
    expect(goalProgressPct({ currentMinor: 100000, targetMinor: 500000 })).toBe(20);
    expect(goalProgressPct({ currentMinor: 999, targetMinor: 1000 })).toBe(99);
    expect(goalProgressPct({ currentMinor: 2000, targetMinor: 1000 })).toBe(100);
  });

  it('summarises a card: target date if ahead, else the first scenario, plus reached and too long', () => {
    expect(summarizeGoal(makeGoal('g', { scenariosMinor: [20000] }), TODAY)).toEqual({ kind: 'months', monthlyMinor: 20000, months: 20, date: '2028-07-21' });
    expect(summarizeGoal(makeGoal('g', { targetDate: '2027-11-21' }), TODAY)).toEqual({ kind: 'by-date', monthlyMinor: 33334, date: '2027-11-21' });
    expect(summarizeGoal(makeGoal('g', { targetDate: '2020-01-01', scenariosMinor: [20000] }), TODAY).kind).toBe('months');
    expect(summarizeGoal(makeGoal('g', { currentMinor: 500000 }), TODAY)).toEqual({ kind: 'reached' });
    expect(summarizeGoal(makeGoal('g', { targetMinor: 100000000, scenariosMinor: [100] }), TODAY)).toEqual({ kind: 'too-long', monthlyMinor: 100 });
  });
});
