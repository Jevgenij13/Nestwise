import type { AppData, Bill, EntityBase, Goal, Household, Item, List, Member, Settings } from '../types.ts';
import { isValidDate } from './dates.ts';
import { MAX_MINOR } from './money.ts';
import { err, ok, type Result } from './result.ts';

/**
 * Hand-written runtime validators for untrusted input (backup files, share codes, stored data).
 * Each returns the first problem as a path-prefixed message, e.g. "bills[2].amountMinor is not a valid amount".
 */

type Rec = Record<string, unknown>;
const STR_MAX = 500;

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = STR_MAX): v is string => typeof v === 'string' && v.length <= max;
const isNonEmptyStr = (v: unknown, max = STR_MAX): v is string => isStr(v, max) && v.length > 0;
const isTimestamp = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const isDate = (v: unknown): v is string => typeof v === 'string' && isValidDate(v);
const isMinor = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_MINOR;
const isOneOf = <T extends string | number>(v: unknown, options: readonly T[]): v is T => options.includes(v as T);
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);

type Check = [field: string, ok: boolean];

function firstProblem(prefix: string, checks: Check[]): string | null {
  const bad = checks.find(([, valid]) => !valid);
  return bad ? `${prefix}.${bad[0]} is not valid` : null;
}

function entityChecks(r: Rec): Check[] {
  return [
    ['id', isNonEmptyStr(r.id, 100)],
    ['createdAt', isTimestamp(r.createdAt)],
    ['updatedAt', isTimestamp(r.updatedAt)],
    ['deletedAt', r.deletedAt === null || isTimestamp(r.deletedAt)],
  ];
}

const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const;
const REPEATS = ['none', 'daily', 'weekly', 'biweekly', 'monthly'] as const;
const LEADS = [0, 1, 3, 7] as const;
const CATEGORIES = ['subscriptions', 'utilities', 'rent-mortgage', 'insurance', 'other'] as const;

type Validator = (v: unknown, path: string) => string | null;

const member: Validator = (v, path) =>
  !isRec(v) ? `${path} is not an object` : firstProblem(path, [...entityChecks(v), ['name', isNonEmptyStr(v.name)], ['colour', isNonEmptyStr(v.colour, 20)]]);

const household: Validator = (v, path) => (!isRec(v) ? `${path} is not an object` : firstProblem(path, [...entityChecks(v), ['name', isNonEmptyStr(v.name)]]));

const bill: Validator = (v, path) =>
  !isRec(v)
    ? `${path} is not an object`
    : firstProblem(path, [
        ...entityChecks(v),
        ['name', isNonEmptyStr(v.name)],
        ['amountMinor', isMinor(v.amountMinor)],
        ['cadence', isOneOf(v.cadence, CADENCES)],
        ['anchorDate', isDate(v.anchorDate)],
        ['leadDays', isOneOf(v.leadDays, LEADS)],
        ['status', isOneOf(v.status, ['active', 'paused'] as const)],
        ['endDate', optional(v.endDate, isDate)],
        ['note', optional(v.note, (x) => isStr(x, 1000))],
        ['category', optional(v.category, (x) => isOneOf(x, CATEGORIES))],
      ]);

const list: Validator = (v, path) =>
  !isRec(v)
    ? `${path} is not an object`
    : firstProblem(path, [
        ...entityChecks(v),
        ['name', isNonEmptyStr(v.name)],
        ['type', isOneOf(v.type, ['chore', 'shopping'] as const)],
        ['sortOrder', typeof v.sortOrder === 'number' && Number.isFinite(v.sortOrder)],
      ]);

const item: Validator = (v, path) =>
  !isRec(v)
    ? `${path} is not an object`
    : firstProblem(path, [
        ...entityChecks(v),
        ['listId', isNonEmptyStr(v.listId, 100)],
        ['title', isNonEmptyStr(v.title)],
        ['qty', optional(v.qty, (x) => isStr(x, 100))],
        ['done', typeof v.done === 'boolean'],
        ['doneAt', optional(v.doneAt, isDate)],
        ['doneBy', optional(v.doneBy, (x) => isRec(x) && isNonEmptyStr(x.memberId, 100) && isStr(x.name))],
        ['assigneeId', optional(v.assigneeId, (x) => isNonEmptyStr(x, 100))],
        ['dueDate', optional(v.dueDate, isDate)],
        ['repeat', optional(v.repeat, (x) => isOneOf(x, REPEATS))],
      ]);

const goal: Validator = (v, path) =>
  !isRec(v)
    ? `${path} is not an object`
    : firstProblem(path, [
        ...entityChecks(v),
        ['name', optional(v.name, (x) => isStr(x))],
        ['targetMinor', isMinor(v.targetMinor)],
        ['currentMinor', isMinor(v.currentMinor)],
        ['scenariosMinor', Array.isArray(v.scenariosMinor) && v.scenariosMinor.length >= 1 && v.scenariosMinor.length <= 4 && v.scenariosMinor.every(isMinor)],
        ['annualRatePct', typeof v.annualRatePct === 'number' && v.annualRatePct >= 0 && v.annualRatePct <= 20],
        ['targetDate', optional(v.targetDate, isDate)],
      ]);

const settings: Validator = (v, path) =>
  !isRec(v)
    ? `${path} is not an object`
    : firstProblem(path, [
        ['currency', typeof v.currency === 'string' && /^[A-Za-z]{3}$/.test(v.currency)],
        ['schemaVersion', Number.isInteger(v.schemaVersion)],
        ['defaultLeadDays', isOneOf(v.defaultLeadDays, LEADS)],
        ['appearance', isOneOf(v.appearance, ['system', 'light', 'dark'] as const)],
        ['monthlyIncomeMinor', optional(v.monthlyIncomeMinor, isMinor)],
        ['currentMemberId', v.currentMemberId === null || isNonEmptyStr(v.currentMemberId, 100)],
        ['badgeEnabled', typeof v.badgeEnabled === 'boolean'],
        ['lastBackupAt', v.lastBackupAt === null || isTimestamp(v.lastBackupAt)],
        ['onboardingDone', typeof v.onboardingDone === 'boolean'],
      ]);

function array(name: string, value: unknown, validator: Validator): string | null {
  if (!Array.isArray(value)) return `${name} is not a list`;
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const problem = validator(value[i], `${name}[${i}]`);
    if (problem) return problem;
    const id = (value[i] as EntityBase).id;
    if (seen.has(id)) return `${name}[${i}].id is a duplicate`;
    seen.add(id);
  }
  return null;
}

export interface ValidatedData {
  settings?: Settings;
  household?: Household | null;
  members?: Member[];
  bills?: Bill[];
  lists?: List[];
  items?: Item[];
  goals?: Goal[];
}

const VALIDATORS = { members: member, bills: bill, lists: list, items: item, goals: goal } as const;

/**
 * Validates a data payload. `required` names the keys that must be present; any other known key that is
 * present is validated too. Items must reference a list present in the same payload when both are present.
 */
export function validateData(value: unknown, required: readonly (keyof ValidatedData)[]): Result<ValidatedData> {
  if (!isRec(value)) return err('Data is not an object.');
  for (const key of required) {
    if (value[key] === undefined) return err(`Missing "${key}".`);
  }
  if (value.settings !== undefined) {
    const problem = settings(value.settings, 'settings');
    if (problem) return err(problem);
  }
  if (value.household !== undefined && value.household !== null) {
    const problem = household(value.household, 'household');
    if (problem) return err(problem);
  }
  for (const [key, validator] of Object.entries(VALIDATORS)) {
    if (value[key] === undefined) continue;
    const problem = array(key, value[key], validator);
    if (problem) return err(problem);
  }
  if (Array.isArray(value.items) && Array.isArray(value.lists)) {
    const listIds = new Set((value.lists as List[]).map((l) => l.id));
    const orphan = (value.items as Item[]).findIndex((i) => !listIds.has(i.listId));
    if (orphan >= 0) return err(`items[${orphan}].listId refers to an unknown list.`);
  }
  return ok(value as ValidatedData);
}

export function isCompleteAppData(data: ValidatedData): data is AppData {
  return data.settings !== undefined && data.household !== undefined && data.members !== undefined && data.bills !== undefined && data.lists !== undefined && data.items !== undefined && data.goals !== undefined;
}
