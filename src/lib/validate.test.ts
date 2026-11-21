import { describe, expect, it } from 'vitest';
import { isCompleteAppData, validateData } from './validate.ts';
import { makeBill, makeGoal, makeItem, makeList, makeMember, sampleData } from './test-fixtures.ts';

const ALL = ['settings', 'household', 'members', 'bills', 'lists', 'items', 'goals'] as const;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const errorOf = (v: unknown, required: readonly (typeof ALL[number])[] = ALL) => {
  const r = validateData(v, required);
  return r.ok ? null : r.error;
};

describe('validateData', () => {
  it('accepts a complete valid data set, including after a JSON round trip', () => {
    expect(validateData(sampleData(), ALL).ok).toBe(true);
    const r = validateData(clone(sampleData()), ALL);
    expect(r.ok && isCompleteAppData(r.value)).toBe(true);
  });

  it('accepts a null household', () => {
    expect(validateData({ ...sampleData(), household: null }, ALL).ok).toBe(true);
  });

  it('rejects non-objects and missing required keys', () => {
    expect(errorOf(null)).toMatch(/not an object/);
    expect(errorOf([])).toMatch(/not an object/);
    expect(errorOf('x')).toMatch(/not an object/);
    const { bills: _b, ...withoutBills } = sampleData();
    expect(errorOf(withoutBills)).toBe('Missing "bills".');
  });

  it('only requires what the caller asks for', () => {
    expect(validateData({ lists: [makeList('l')], items: [makeItem('i', 'l')], members: [] }, ['lists', 'items', 'members']).ok).toBe(true);
  });

  it.each([
    ['bill amount is not an integer', (d: any) => (d.bills[0].amountMinor = 12.5), 'bills[0].amountMinor'],
    ['bill amount is negative', (d: any) => (d.bills[0].amountMinor = -1), 'bills[0].amountMinor'],
    ['bill amount is a string', (d: any) => (d.bills[0].amountMinor = '1250'), 'bills[0].amountMinor'],
    ['bill cadence is unknown', (d: any) => (d.bills[0].cadence = 'daily'), 'bills[0].cadence'],
    ['bill anchor date is impossible', (d: any) => (d.bills[0].anchorDate = '2026-02-30'), 'bills[0].anchorDate'],
    ['bill lead days is not allowed', (d: any) => (d.bills[0].leadDays = 5), 'bills[0].leadDays'],
    ['bill name is empty', (d: any) => (d.bills[0].name = ''), 'bills[0].name'],
    ['bill status is unknown', (d: any) => (d.bills[0].status = 'gone'), 'bills[0].status'],
    ['bill category is unknown', (d: any) => (d.bills[0].category = 'fun'), 'bills[0].category'],
    ['entity updatedAt is not a date', (d: any) => (d.items[0].updatedAt = 'yesterday'), 'items[0].updatedAt'],
    ['entity deletedAt is undefined', (d: any) => delete d.items[0].deletedAt, 'items[0].deletedAt'],
    ['item done is not boolean', (d: any) => (d.items[0].done = 'yes'), 'items[0].done'],
    ['item repeat is unknown', (d: any) => (d.items[0].repeat = 'hourly'), 'items[0].repeat'],
    ['item doneBy is malformed', (d: any) => (d.items[1].doneBy = { memberId: 5 }), 'items[1].doneBy'],
    ['list type is unknown', (d: any) => (d.lists[0].type = 'todo'), 'lists[0].type'],
    ['goal has no scenarios', (d: any) => (d.goals[0].scenariosMinor = []), 'goals[0].scenariosMinor'],
    ['goal has 5 scenarios', (d: any) => (d.goals[0].scenariosMinor = [1, 2, 3, 4, 5]), 'goals[0].scenariosMinor'],
    ['goal rate is above 20', (d: any) => (d.goals[0].annualRatePct = 21), 'goals[0].annualRatePct'],
    ['settings currency is malformed', (d: any) => (d.settings.currency = 'EURO'), 'settings.currency'],
    ['settings appearance is unknown', (d: any) => (d.settings.appearance = 'sepia'), 'settings.appearance'],
    ['household name is missing', (d: any) => delete d.household.name, 'household.name'],
    ['member colour is missing', (d: any) => delete d.members[0].colour, 'members[0].colour'],
  ])('rejects: %s', (_label, mutate, path) => {
    const data = clone(sampleData());
    mutate(data);
    expect(errorOf(data)).toContain(path);
  });

  it('rejects duplicate ids within a collection', () => {
    expect(errorOf({ ...sampleData(), members: [makeMember('m'), makeMember('m')] })).toBe('members[1].id is a duplicate');
  });

  it('rejects items that point at an unknown list', () => {
    expect(errorOf({ ...sampleData(), items: [makeItem('i', 'nope')] })).toBe('items[0].listId refers to an unknown list.');
  });

  it('rejects a collection that is not a list', () => {
    expect(errorOf({ ...sampleData(), goals: {} })).toBe('goals is not a list');
  });

  it('caps absurdly long strings', () => {
    expect(errorOf({ ...sampleData(), bills: [makeBill('x', { name: 'a'.repeat(501) })] })).toContain('bills[0].name');
  });

  it('accepts optional fields when absent and when present', () => {
    expect(validateData({ ...sampleData(), goals: [makeGoal('g'), makeGoal('g2', { name: 'x', targetDate: '2030-01-01' })] }, ALL).ok).toBe(true);
  });
});

describe('isCompleteAppData', () => {
  it('is false when any collection is missing', () => {
    expect(isCompleteAppData({ members: [] })).toBe(false);
    expect(isCompleteAppData(sampleData())).toBe(true);
  });
});
