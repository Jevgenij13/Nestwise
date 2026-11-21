import type { AppData, Bill, Goal, Item, List, Member } from '../types.ts';
import { emptyData } from './storage.ts';

/** Builders for unit tests only. */

export const T0 = '2026-11-21T09:00:00.000Z';

const base = (id: string, at = T0) => ({ id, createdAt: at, updatedAt: at, deletedAt: null });

export function makeMember(id: string, name = id, overrides: Partial<Member> = {}): Member {
  return { ...base(id), name, colour: '#b04e27', ...overrides };
}

export function makeBill(id: string, overrides: Partial<Bill> = {}): Bill {
  return { ...base(id), name: `Bill ${id}`, amountMinor: 999, cadence: 'monthly', anchorDate: '2026-11-21', leadDays: 3, status: 'active', ...overrides };
}

export function makeList(id: string, overrides: Partial<List> = {}): List {
  return { ...base(id), name: `List ${id}`, type: 'shopping', sortOrder: 0, ...overrides };
}

export function makeItem(id: string, listId: string, overrides: Partial<Item> = {}): Item {
  return { ...base(id), listId, title: `Item ${id}`, done: false, ...overrides };
}

export function makeGoal(id: string, overrides: Partial<Goal> = {}): Goal {
  return { ...base(id), targetMinor: 500000, currentMinor: 100000, scenariosMinor: [10000, 20000, 25000, 40000], annualRatePct: 0, ...overrides };
}

export function makeData(overrides: Partial<AppData> = {}): AppData {
  return { ...emptyData('EUR'), ...overrides };
}

/** A realistic data set touching every collection. */
export function sampleData(): AppData {
  const members = [makeMember('m1', 'Me'), makeMember('m2', 'Anna', { colour: '#3f7d58' })];
  const lists = [makeList('l1', { name: 'Chores', type: 'chore', sortOrder: 0 }), makeList('l2', { name: 'Shopping', sortOrder: 1 })];
  return makeData({
    settings: { ...emptyData('EUR').settings, onboardingDone: true, currentMemberId: 'm1', monthlyIncomeMinor: 200000 },
    household: { ...base('h1'), name: 'Home' },
    members,
    bills: [makeBill('b1', { name: 'Netflix', amountMinor: 1299, note: 'Family plan', category: 'subscriptions' }), makeBill('b2', { cadence: 'yearly', anchorDate: '2024-02-29', status: 'paused' })],
    lists,
    items: [
      makeItem('i1', 'l1', { title: 'Take out bins', assigneeId: 'm2', dueDate: '2026-11-22', repeat: 'weekly' }),
      makeItem('i2', 'l2', { title: 'Milk', qty: '2 x', done: true, doneAt: '2026-11-20', doneBy: { memberId: 'm1', name: 'Me' } }),
    ],
    goals: [makeGoal('g1', { name: 'Holiday', targetDate: '2028-06-01' })],
  });
}
