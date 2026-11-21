import type { DateString } from '../types.ts';
import { addMonths, compareDates, monthsUntilCeil } from './dates.ts';
import { MAX_GOAL_MONTHS, MAX_GOAL_YEARS_AHEAD, MAX_SCENARIOS } from './limits.ts';
import { divCeil, divRoundHalfUp } from './money.ts';
import { err, ok, type Result } from './result.ts';

/**
 * Savings calculator (PRD section 7). Contributions are made at the end of each month, the first one
 * month from today. At 0% everything is exact integer arithmetic; with interest it uses the closed-form
 * compound formulas in floating point, which is acceptable because the result is a whole month count
 * or a rounded-up amount.
 */

export interface GoalInput {
  goalMinor: number;
  savedMinor: number;
  /** Annual rate in percent, 0 to 20. */
  annualRatePct: number;
}

export type MonthsResult =
  | { kind: 'no-goal' }
  | { kind: 'reached' }
  | { kind: 'no-amount' }
  | { kind: 'too-long' }
  | { kind: 'ok'; months: number };

const EPSILON = 1e-7;

/** Smallest whole number of months n with S(1+i)^n + c((1+i)^n - 1)/i >= G (at 0%: ceil((G - S) / c)). */
export function monthsToGoal(input: GoalInput, monthlyMinor: number): MonthsResult {
  const { goalMinor, savedMinor, annualRatePct } = input;
  if (!(goalMinor > 0)) return { kind: 'no-goal' };
  if (savedMinor >= goalMinor) return { kind: 'reached' };
  if (!(monthlyMinor > 0)) return { kind: 'no-amount' };

  if (annualRatePct === 0) {
    const months = divCeil(goalMinor - savedMinor, monthlyMinor);
    return months > MAX_GOAL_MONTHS ? { kind: 'too-long' } : { kind: 'ok', months };
  }

  const growth = 1 + annualRatePct / 100 / 12;
  let balance = savedMinor;
  for (let months = 1; months <= MAX_GOAL_MONTHS; months++) {
    balance = balance * growth + monthlyMinor;
    if (balance >= goalMinor - EPSILON) return { kind: 'ok', months };
  }
  return { kind: 'too-long' };
}

/** "3 yrs 4 mo", "1 yr", "10 mo". */
export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearText = `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  if (years === 0) return `${rest} mo`;
  return rest === 0 ? yearText : `${yearText} ${rest} mo`;
}

export interface ScenarioResult {
  monthlyMinor: number;
  result: MonthsResult;
  /** Present when `result.kind` is "ok". */
  targetDate?: DateString;
}

/** One column per scenario (AC-GOAL-2): months, duration and target month for each monthly amount. */
export function scenarioResults(input: GoalInput, scenariosMinor: number[], today: DateString): ScenarioResult[] {
  return scenariosMinor.map((monthlyMinor) => {
    const result = monthsToGoal(input, monthlyMinor);
    return result.kind === 'ok' ? { monthlyMinor, result, targetDate: addMonths(today, result.months) } : { monthlyMinor, result };
  });
}

/**
 * Default scenarios from one entered amount (AC-GOAL-2): 0.5x, 1x, 1.5x, 2x, each rounded half up to a
 * whole currency unit with a minimum of one unit. `unit` is 10^digits minor units.
 */
export function defaultScenarios(monthlyMinor: number, unit: number): number[] {
  return [1, 2, 3, 4].slice(0, MAX_SCENARIOS).map((halves) => Math.max(1, divRoundHalfUp(monthlyMinor * halves, 2 * unit)) * unit);
}

export type RequiredError = 'no-goal' | 'invalid-date' | 'not-future' | 'too-far';

export type RequiredResult =
  | { kind: 'reached' }
  /** Existing savings plus interest already reach the goal by the target date. */
  | { kind: 'covered-by-interest'; months: number }
  | { kind: 'ok'; months: number; monthlyMinor: number };

/**
 * Reverse mode (AC-GOAL-6, 7): required monthly amount to hit the goal by `targetDate`.
 * m = whole months from today, rounded up; c is rounded up to the minor unit so the goal is always reached.
 */
export function requiredMonthly(input: GoalInput, targetDate: DateString, today: DateString): Result<RequiredResult, RequiredError> {
  const { goalMinor, savedMinor, annualRatePct } = input;
  if (!(goalMinor > 0)) return err('no-goal');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return err('invalid-date');
  if (compareDates(targetDate, today) <= 0) return err('not-future');
  if (compareDates(targetDate, addMonths(today, MAX_GOAL_YEARS_AHEAD * 12)) > 0) return err('too-far');
  if (savedMinor >= goalMinor) return ok({ kind: 'reached' });

  const months = monthsUntilCeil(today, targetDate);
  if (annualRatePct === 0) return ok({ kind: 'ok', months, monthlyMinor: divCeil(goalMinor - savedMinor, months) });

  const i = annualRatePct / 100 / 12;
  const factor = (1 + i) ** months;
  const gap = goalMinor - savedMinor * factor;
  if (gap <= 0) return ok({ kind: 'covered-by-interest', months });
  return ok({ kind: 'ok', months, monthlyMinor: Math.max(1, Math.ceil((gap * i) / (factor - 1) - EPSILON)) });
}

export type RateError = 'invalid' | 'out-of-range' | 'too-many-decimals';

/** Parses the annual interest rate field (AC-GOAL-4): empty is 0; 0 to 20 with up to 2 decimals; "," or "." as separator. */
export function parseRatePct(input: string): Result<number, RateError> {
  const s = input.trim().replace(',', '.');
  if (s === '') return ok(0);
  if (!/^\d*\.?\d*$/.test(s) || !/\d/.test(s)) return err('invalid');
  const decimals = s.split('.')[1] ?? '';
  if (decimals.length > 2) return err('too-many-decimals');
  const value = Number(s);
  return value > 20 ? err('out-of-range') : ok(value);
}

/** Amount for "Add scenario" (AC-GOAL-2): 1.5x the largest existing amount, rounded to a whole currency unit, at least one unit above it. */
export function nextScenario(scenariosMinor: number[], unit: number): number {
  const largest = scenariosMinor.reduce((max, v) => Math.max(max, v), 0);
  if (largest === 0) return unit;
  return Math.max(largest + unit, divRoundHalfUp(largest * 3, 2 * unit) * unit);
}
