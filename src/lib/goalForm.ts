import type { DateString, Goal, IsoTimestamp } from '../types.ts';
import { addDays, addMonths } from './dates.ts';
import { MAX_GOAL_YEARS_AHEAD, MAX_SCENARIOS } from './limits.ts';
import { MAX_MINOR, minorDigits, minorToInput, parseAmount, type AmountError } from './money.ts';
import { defaultScenarios, monthsToGoal, parseRatePct, requiredMonthly, scenarioResults, type GoalInput, type RateError, type RequiredError, type RequiredResult, type ScenarioResult } from './savings.ts';
import { err, ok, type Result } from './result.ts';

/**
 * Goal calculator form (AC-GOAL-1 to 7): everything the sheet needs, as pure functions of the typed text.
 * Amounts stay strings while typing; `evaluateGoalForm` parses them and runs the maths on every change.
 */

export type GoalMode = 'how-long' | 'by-date';

export interface GoalForm {
  name: string;
  goal: string;
  saved: string;
  rate: string;
  /** The "base" amount the default scenarios are generated from. */
  monthly: string;
  /** One text per scenario card, 0 to 4. */
  scenarios: string[];
  /** True once a card was edited, added or removed by hand: the monthly field then stops regenerating them (DESIGN 5.7). */
  scenariosEdited: boolean;
  mode: GoalMode;
  targetDate: DateString | '';
}

export const unitOf = (currency: string): number => 10 ** minorDigits(currency);

/** "100" for whole units, "99.50" otherwise: what scenario cards show. */
export function amountText(minor: number, currency: string): string {
  const text = minorToInput(minor, currency);
  return text.replace(/\.0+$/, '');
}

export function emptyGoalForm(): GoalForm {
  return { name: '', goal: '', saved: '', rate: '', monthly: '', scenarios: [], scenariosEdited: false, mode: 'how-long', targetDate: '' };
}

/** Opens a saved goal. The base amount is the 1x scenario; if the cards are not the 0.5x..2x of it they count as hand-edited. */
export function formFromGoal(goal: Goal, currency: string): GoalForm {
  const unit = unitOf(currency);
  const base = goal.scenariosMinor[1] ?? goal.scenariosMinor[0] ?? 0;
  const generated = defaultScenarios(base, unit);
  return {
    name: goal.name ?? '',
    goal: amountText(goal.targetMinor, currency),
    saved: amountText(goal.currentMinor, currency),
    rate: goal.annualRatePct === 0 ? '' : String(goal.annualRatePct),
    monthly: base > 0 ? amountText(base, currency) : '',
    scenarios: goal.scenariosMinor.map((m) => amountText(m, currency)),
    scenariosEdited: generated.length !== goal.scenariosMinor.length || generated.some((g, i) => g !== goal.scenariosMinor[i]),
    mode: goal.targetDate ? 'by-date' : 'how-long',
    targetDate: goal.targetDate ?? '',
  };
}

/** Typing in the monthly field: regenerates 0.5x/1x/1.5x/2x until a card was edited by hand. */
export function withMonthly(form: GoalForm, monthly: string, currency: string): GoalForm {
  if (form.scenariosEdited) return { ...form, monthly };
  const parsed = parseAmount(monthly, currency);
  return { ...form, monthly, scenarios: parsed.ok ? defaultScenarios(parsed.value, unitOf(currency)).map((m) => amountText(m, currency)) : [] };
}

/** "Reset scenarios": regenerate from the base amount and go back to following it. */
export function resetScenarios(form: GoalForm, currency: string): GoalForm {
  return withMonthly({ ...form, scenariosEdited: false }, form.monthly, currency);
}

export function withScenario(form: GoalForm, index: number, text: string): GoalForm {
  return { ...form, scenariosEdited: true, scenarios: form.scenarios.map((s, i) => (i === index ? text : s)) };
}

export function withoutScenario(form: GoalForm, index: number): GoalForm {
  return { ...form, scenariosEdited: true, scenarios: form.scenarios.filter((_, i) => i !== index) };
}

export function withAddedScenario(form: GoalForm, amountMinor: number, currency: string): GoalForm {
  if (form.scenarios.length >= MAX_SCENARIOS) return form;
  return { ...form, scenariosEdited: true, scenarios: [...form.scenarios, amountText(amountMinor, currency)] };
}

export interface ScenarioEval {
  /** Parsed card amount, or null when the text is empty or invalid. */
  amountMinor: number | null;
  error?: AmountError;
  result?: ScenarioResult;
}

export type RequiredEval = { kind: 'empty' } | { kind: 'error'; error: RequiredError } | { kind: 'ok'; value: RequiredResult };

export interface GoalEval {
  /** needs-goal: nothing to show yet. invalid: a field has an error, no results. reached: saved >= goal. ready: results are shown. */
  status: 'needs-goal' | 'invalid' | 'reached' | 'ready';
  goalError?: AmountError;
  savedError?: AmountError;
  rateError?: RateError;
  input?: GoalInput;
  scenarios: ScenarioEval[];
  /** Card indexes with the fewest months (shown with a "Fastest" pill) when more than one card has a result. */
  fastest: number[];
  required?: RequiredEval;
}

/** Parses the form and computes every result. Live on each change: no Calculate button (AC-GOAL-1). */
export function evaluateGoalForm(form: GoalForm, currency: string, today: DateString): GoalEval {
  const goal = parseAmount(form.goal, currency);
  const saved = form.saved.trim() === '' ? ok(0) : parseAmount(form.saved, currency, { allowZero: true });
  const rate = parseRatePct(form.rate);

  const goalError = !goal.ok && goal.error !== 'empty' && goal.error !== 'zero' ? goal.error : undefined;
  const savedError = !saved.ok ? saved.error : undefined;
  const rateError = !rate.ok ? rate.error : undefined;

  const parsedScenarios = form.scenarios.map((text) => parseAmount(text, currency));
  const scenarios: ScenarioEval[] = parsedScenarios.map((r) => (r.ok ? { amountMinor: r.value } : { amountMinor: null, error: r.error }));

  const base = { goalError, savedError, rateError, scenarios, fastest: [] as number[] };
  if (goalError || savedError || rateError) return { status: 'invalid', ...base };
  if (!goal.ok) return { status: 'needs-goal', ...base };
  if (!saved.ok || !rate.ok) return { status: 'invalid', ...base };

  const input: GoalInput = { goalMinor: goal.value, savedMinor: saved.value, annualRatePct: rate.value };

  let required: RequiredEval | undefined;
  if (form.mode === 'by-date') {
    if (form.targetDate === '') required = { kind: 'empty' };
    else {
      const r = requiredMonthly(input, form.targetDate, today);
      required = r.ok ? { kind: 'ok', value: r.value } : { kind: 'error', error: r.error };
    }
  }
  if (saved.value >= goal.value) return { status: 'reached', input, ...base, required };

  const valid = scenarios.flatMap((s, index) => (s.amountMinor === null ? [] : [{ index, amountMinor: s.amountMinor }]));
  const results = scenarioResults(input, valid.map((v) => v.amountMinor), today);
  valid.forEach((v, i) => {
    const target = scenarios[v.index];
    if (target) target.result = results[i];
  });

  const okMonths = valid.flatMap((v, i) => {
    const r = results[i]?.result;
    return r?.kind === 'ok' ? [{ index: v.index, months: r.months }] : [];
  });
  const fewest = Math.min(...okMonths.map((m) => m.months));
  const fastest = okMonths.length > 1 && okMonths.some((m) => m.months !== fewest) ? okMonths.filter((m) => m.months === fewest).map((m) => m.index) : [];
  return { status: 'ready', input, scenarios, fastest, required };
}

/** Bounds for the date picker in "By a date" mode (AC-GOAL-6). */
export function targetDateBounds(today: DateString): { min: DateString; max: DateString } {
  return { min: addDays(today, 1), max: addMonths(today, MAX_GOAL_YEARS_AHEAD * 12) };
}

export type GoalSaveError = 'needs-goal' | 'invalid' | 'no-scenario' | 'bad-scenario' | 'by-date-needed';

export interface GoalFields {
  name?: string;
  targetMinor: number;
  currentMinor: number;
  scenariosMinor: number[];
  annualRatePct: number;
  targetDate?: DateString;
}

/** What gets stored (AC-GOAL-9). By-date mode keeps the date; in how-long mode no date is saved. Never saves invalid input. */
export function goalFieldsFromForm(form: GoalForm, currency: string, today: DateString): Result<GoalFields, GoalSaveError> {
  const evaluation = evaluateGoalForm(form, currency, today);
  if (evaluation.status === 'needs-goal') return err('needs-goal');
  if (evaluation.status === 'invalid' || !evaluation.input) return err('invalid');

  const byDate = form.mode === 'by-date';
  // In by-date mode the cards are hidden, so a half-typed card is dropped instead of blocking Save.
  if (!byDate && evaluation.scenarios.some((s) => s.amountMinor === null)) return err('bad-scenario');
  let scenariosMinor = evaluation.scenarios.flatMap((s) => (s.amountMinor === null ? [] : [s.amountMinor]));

  let targetDate: DateString | undefined;
  if (byDate && form.targetDate !== '') {
    const required = evaluation.required;
    if (required?.kind !== 'ok') return err('by-date-needed');
    targetDate = form.targetDate;
    if (scenariosMinor.length === 0 && required.value.kind === 'ok') scenariosMinor = defaultScenarios(required.value.monthlyMinor, unitOf(currency));
  }
  if (scenariosMinor.length === 0) return err('no-scenario');

  const name = form.name.trim();
  return ok({
    ...(name ? { name } : {}),
    targetMinor: evaluation.input.goalMinor,
    currentMinor: evaluation.input.savedMinor,
    scenariosMinor,
    annualRatePct: evaluation.input.annualRatePct,
    ...(targetDate ? { targetDate } : {}),
  });
}

/** "Add to savings" (AC-GOAL-9): adds to the stored amount. Null when the new total would be out of range. */
export function addToSavings(currentMinor: number, addedMinor: number): number | null {
  const total = currentMinor + addedMinor;
  return addedMinor > 0 && total <= MAX_MINOR ? total : null;
}

export function monthsText(months: number): string {
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

export function createGoal(fields: GoalFields, id: string, now: IsoTimestamp): Goal {
  return { id, createdAt: now, updatedAt: now, deletedAt: null, ...fields };
}

/** Replaces the editable fields; a name or date that was cleared is removed. */
export function editGoal(goal: Goal, fields: GoalFields, now: IsoTimestamp): Goal {
  const { name: _name, targetDate: _date, ...rest } = goal;
  return { ...rest, ...fields, updatedAt: now };
}

/** Saved amount as a whole percent of the target, 0 to 100 (progress bar, AC-GOAL-11). */
export function goalProgressPct(goal: Pick<Goal, 'currentMinor' | 'targetMinor'>): number {
  if (goal.targetMinor <= 0) return 0;
  return Math.min(100, Math.floor((goal.currentMinor * 100) / goal.targetMinor));
}

export type GoalSummary =
  | { kind: 'reached' }
  | { kind: 'months'; monthlyMinor: number; months: number; date: DateString }
  | { kind: 'too-long'; monthlyMinor: number }
  /** A saved target date: put aside `monthlyMinor` each month to reach it by `date`. */
  | { kind: 'by-date'; monthlyMinor: number; date: DateString }
  | { kind: 'covered'; date: DateString };

/** The one-line result on a saved goal card: its target date if still ahead, else its first scenario (DESIGN 5.7). */
export function summarizeGoal(goal: Goal, today: DateString): GoalSummary {
  const input: GoalInput = { goalMinor: goal.targetMinor, savedMinor: goal.currentMinor, annualRatePct: goal.annualRatePct };
  if (goal.currentMinor >= goal.targetMinor) return { kind: 'reached' };
  if (goal.targetDate) {
    const required = requiredMonthly(input, goal.targetDate, today);
    if (required.ok && required.value.kind === 'ok') return { kind: 'by-date', monthlyMinor: required.value.monthlyMinor, date: goal.targetDate };
    if (required.ok && required.value.kind === 'covered-by-interest') return { kind: 'covered', date: goal.targetDate };
  }
  const monthlyMinor = goal.scenariosMinor[0] ?? 0;
  const result = monthsToGoal(input, monthlyMinor);
  if (result.kind === 'ok') return { kind: 'months', monthlyMinor, months: result.months, date: addMonths(today, result.months) };
  return { kind: 'too-long', monthlyMinor };
}
