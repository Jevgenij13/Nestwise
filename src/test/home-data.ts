import type { AppData, Item } from '../types.ts';
import { makeData, makeItem, makeList, makeMember, T0 } from '../lib/test-fixtures.ts';

/** Onboarded data with no household yet (Home shows its setup). */
export function onboarded(data: AppData = makeData()): AppData {
  return { ...data, settings: { ...data.settings, onboardingDone: true, currency: 'EUR' } };
}

/** A household "Home" with Me (current) and Anna, a Chores list (l1) and a Shopping list (l2). */
export function household(items: Item[] = []): AppData {
  const base = onboarded(
    makeData({
      household: { id: 'h', name: 'Home', createdAt: T0, updatedAt: T0, deletedAt: null },
      members: [makeMember('m1', 'Me'), makeMember('m2', 'Anna', { colour: '#3f6e8e' })],
      lists: [makeList('l1', { name: 'Chores', type: 'chore', sortOrder: 0 }), makeList('l2', { name: 'Shopping', type: 'shopping', sortOrder: 1 })],
      items,
    }),
  );
  return { ...base, settings: { ...base.settings, currentMemberId: 'm1' } };
}

export { makeItem };
