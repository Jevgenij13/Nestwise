import { describe, expect, it } from 'vitest';
import {
  assignItem,
  choreUrgency,
  deleteList,
  editItem,
  listSummary,
  orderOpenItems,
  removeMemberFromData,
  renameList,
  renameMember,
  restoreListItems,
  choreDaysUntil,
  choreDueText,
  clearDone,
  createHousehold,
  createItem,
  createList,
  createMember,
  dueSoonChores,
  filterChores,
  isMine,
  itemsForList,
  MEMBER_COLOURS,
  nextMemberColour,
  removeMember,
  resolveCurrentMemberId,
  setItemDone,
} from './household.ts';
import { softDelete } from './entities.ts';
import { makeData, makeItem, makeList, makeMember, T0 } from './test-fixtures.ts';

const NOW = '2026-11-21T09:00:00.000Z';
const stamp = { now: NOW, today: '2026-11-21' };

describe('createHousehold (AC-HOME-1, 2)', () => {
  it('creates a household, one member and one Chores and one Shopping list', () => {
    const r = createHousehold({ householdName: ' Our home ', memberName: 'Me', now: NOW, ids: ['h', 'm', 'l1', 'l2'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.household).toMatchObject({ id: 'h', name: 'Our home', deletedAt: null });
    expect(r.value.member).toMatchObject({ id: 'm', name: 'Me', colour: MEMBER_COLOURS[0] });
    expect(r.value.lists.map((l) => [l.name, l.type, l.sortOrder])).toEqual([['Chores', 'chore', 0], ['Shopping', 'shopping', 1]]);
  });
  it('requires both names', () => {
    expect(createHousehold({ householdName: ' ', memberName: 'Me', now: NOW, ids: ['a', 'b', 'c', 'd'] })).toEqual({ ok: false, error: 'required' });
    expect(createHousehold({ householdName: 'H', memberName: '', now: NOW, ids: ['a', 'b', 'c', 'd'] })).toEqual({ ok: false, error: 'required' });
  });
});

describe('members (AC-HOME-1)', () => {
  it('auto-assigns distinct colours', () => {
    let members = [] as ReturnType<typeof makeMember>[];
    for (let i = 0; i < 8; i++) {
      const r = createMember(members, `M${i}`, `m${i}`, NOW);
      expect(r.ok).toBe(true);
      if (r.ok) members = [...members, r.value];
    }
    expect(new Set(members.map((m) => m.colour)).size).toBe(8);
  });
  it('limits to 8 live members, trims and validates names', () => {
    const eight = Array.from({ length: 8 }, (_, i) => makeMember(`m${i}`, `M${i}`));
    expect(createMember(eight, 'Nine', 'm9', NOW)).toEqual({ ok: false, error: 'limit-reached' });
    expect(createMember([], '  ', 'x', NOW)).toEqual({ ok: false, error: 'required' });
    expect(createMember([], 'x'.repeat(31), 'x', NOW)).toEqual({ ok: false, error: 'too-long' });
    const r = createMember([], '  Anna ', 'a', NOW);
    expect(r.ok && r.value.name).toBe('Anna');
  });
  it('removed members free up a slot and their colour', () => {
    const eight = Array.from({ length: 8 }, (_, i) => makeMember(`m${i}`, `M${i}`, { colour: MEMBER_COLOURS[i] }));
    const afterRemove = [softDelete(eight[0]!, NOW), ...eight.slice(1)];
    expect(createMember(afterRemove, 'New', 'n', NOW).ok).toBe(true);
    expect(nextMemberColour(afterRemove)).toBe(MEMBER_COLOURS[0]);
  });
  it('resolveCurrentMemberId keeps a live choice, otherwise falls back', () => {
    const members = [makeMember('a'), softDelete(makeMember('b'), NOW), makeMember('c')];
    expect(resolveCurrentMemberId(members, 'c')).toBe('c');
    expect(resolveCurrentMemberId(members, 'b')).toBe('a');
    expect(resolveCurrentMemberId(members, null)).toBe('a');
    expect(resolveCurrentMemberId([], 'a')).toBeNull();
  });
});

describe('lists (AC-HOME-2)', () => {
  it('creates lists up to 20', () => {
    const lists = Array.from({ length: 19 }, (_, i) => makeList(`l${i}`, { sortOrder: i }));
    const r = createList(lists, ' Garden ', 'chore', 'new', NOW);
    expect(r.ok && r.value).toMatchObject({ name: 'Garden', type: 'chore', sortOrder: 19 });
    expect(createList([...lists, makeList('l19')], 'x', 'shopping', 'n', NOW)).toEqual({ ok: false, error: 'limit-reached' });
    expect(createList(lists, '', 'shopping', 'n', NOW)).toEqual({ ok: false, error: 'required' });
  });
  it('deleted lists do not count toward the limit', () => {
    const lists = Array.from({ length: 20 }, (_, i) => (i === 0 ? softDelete(makeList('l0'), NOW) : makeList(`l${i}`)));
    expect(createList(lists, 'x', 'shopping', 'n', NOW).ok).toBe(true);
  });
});

describe('createItem (AC-HOME-3, 5, 6)', () => {
  it('trims the title and ignores empty or whitespace-only text', () => {
    expect(createItem({ listId: 'l', title: '   ', id: 'i', now: NOW })).toBeNull();
    expect(createItem({ listId: 'l', title: '', id: 'i', now: NOW })).toBeNull();
    expect(createItem({ listId: 'l', title: '  Milk ', id: 'i', now: NOW })).toEqual({ id: 'i', listId: 'l', title: 'Milk', done: false, createdAt: NOW, updatedAt: NOW, deletedAt: null });
  });
  it('keeps optional quantity, assignee, due date and repeat only when set', () => {
    const item = createItem({ listId: 'l', title: 'Bins', qty: ' 2 x ', assigneeId: 'm', dueDate: '2026-11-22', repeat: 'weekly', id: 'i', now: NOW });
    expect(item).toMatchObject({ qty: '2 x', assigneeId: 'm', dueDate: '2026-11-22', repeat: 'weekly' });
    const plain = createItem({ listId: 'l', title: 'Bins', qty: ' ', repeat: 'none', id: 'i', now: NOW });
    expect(plain).not.toHaveProperty('qty');
    expect(plain).not.toHaveProperty('repeat');
    expect(plain).not.toHaveProperty('assigneeId');
  });
});

describe('setItemDone (AC-HOME-4)', () => {
  const me = makeMember('m1', 'Me');
  it('stamps the current member and local date', () => {
    const { item, next } = setItemDone(makeItem('i', 'l'), true, me, stamp, 'n');
    expect(item).toMatchObject({ done: true, doneAt: '2026-11-21', doneBy: { memberId: 'm1', name: 'Me' }, updatedAt: NOW });
    expect(next).toBeUndefined();
  });
  it('un-checking restores the item and clears the stamp', () => {
    const done = setItemDone(makeItem('i', 'l'), true, me, stamp, 'n').item;
    const { item } = setItemDone(done, false, me, { now: '2026-11-21T10:00:00.000Z', today: '2026-11-21' }, 'n');
    expect(item.done).toBe(false);
    expect(item).not.toHaveProperty('doneAt');
    expect(item).not.toHaveProperty('doneBy');
    expect(item.updatedAt).toBe('2026-11-21T10:00:00.000Z');
  });
  it('works without a current member', () => {
    const { item } = setItemDone(makeItem('i', 'l'), true, null, stamp, 'n');
    expect(item.done).toBe(true);
    expect(item).not.toHaveProperty('doneBy');
  });
});

describe('recurring chores (AC-HOME-13)', () => {
  const me = makeMember('m1', 'Me');
  it('completing a weekly chore due 2026-11-21 creates one due 2026-11-28', () => {
    const chore = makeItem('c', 'l', { title: 'Bins', repeat: 'weekly', dueDate: '2026-11-21', assigneeId: 'm1', qty: 'x' });
    const { item, next } = setItemDone(chore, true, me, stamp, 'c2');
    expect(item.done).toBe(true);
    expect(next).toMatchObject({ id: 'c2', title: 'Bins', repeat: 'weekly', dueDate: '2026-11-28', assigneeId: 'm1', qty: 'x', done: false, createdAt: NOW, deletedAt: null });
    expect(next).not.toHaveProperty('doneAt');
    expect(next).not.toHaveProperty('doneBy');
  });
  it('is based on the previous due date even when completed late', () => {
    const chore = makeItem('c', 'l', { repeat: 'weekly', dueDate: '2026-11-07' });
    expect(setItemDone(chore, true, me, stamp, 'n').next?.dueDate).toBe('2026-11-14');
  });
  it('supports daily, biweekly and monthly with month-end clamping', () => {
    const due = (repeat: 'daily' | 'biweekly' | 'monthly', dueDate: string) => setItemDone(makeItem('c', 'l', { repeat, dueDate }), true, me, stamp, 'n').next?.dueDate;
    expect(due('daily', '2026-11-21')).toBe('2026-11-22');
    expect(due('biweekly', '2026-11-21')).toBe('2026-12-05');
    expect(due('monthly', '2026-01-31')).toBe('2026-02-28');
  });
  it('uses today as the base when the chore has no due date', () => {
    expect(setItemDone(makeItem('c', 'l', { repeat: 'weekly' }), true, me, stamp, 'n').next?.dueDate).toBe('2026-11-28');
  });
  it('does not repeat for "none" or non-recurring items', () => {
    expect(setItemDone(makeItem('c', 'l', { repeat: 'none', dueDate: '2026-11-21' }), true, me, stamp, 'n').next).toBeUndefined();
  });
});

describe('removeMember (AC-HOME-8)', () => {
  it('tombstones the member, unassigns their open tasks, never deletes tasks, and keeps doneBy names', () => {
    const members = [makeMember('a', 'Anna'), makeMember('b', 'Ben')];
    const items = [
      makeItem('1', 'l', { assigneeId: 'a' }),
      makeItem('2', 'l', { assigneeId: 'b' }),
      makeItem('3', 'l', { done: true, doneBy: { memberId: 'a', name: 'Anna' }, assigneeId: 'a' }),
      makeItem('4', 'l'),
    ];
    const result = removeMember(members, items, 'a', NOW);
    expect(result.members.find((m) => m.id === 'a')?.deletedAt).toBe(NOW);
    expect(result.members.find((m) => m.id === 'b')?.deletedAt).toBeNull();
    expect(result.items).toHaveLength(4);
    expect(result.items.every((i) => i.deletedAt === null)).toBe(true);
    expect(result.items[0]).not.toHaveProperty('assigneeId');
    expect(result.items[0]?.updatedAt).toBe(NOW);
    expect(result.items[1]?.assigneeId).toBe('b');
    expect(result.items[1]?.updatedAt).toBe(T0);
    expect(result.items[2]?.doneBy).toEqual({ memberId: 'a', name: 'Anna' });
    expect(result.items[3]).toBe(items[3]);
  });
});

describe('assignItem / isMine / filterChores (AC-HOME-6, 7)', () => {
  const items = [makeItem('anyone', 'l'), makeItem('mine', 'l', { assigneeId: 'm1' }), makeItem('theirs', 'l', { assigneeId: 'm2' })];
  it('assigns and unassigns (Anyone)', () => {
    const assigned = assignItem(items[0]!, 'm2', NOW);
    expect(assigned).toMatchObject({ assigneeId: 'm2', updatedAt: NOW });
    expect(assignItem(assigned, undefined, NOW)).not.toHaveProperty('assigneeId');
  });
  it('Mine = assigned to the current member or Anyone; switching member changes it immediately', () => {
    expect(filterChores(items, 'mine', 'm1').map((i) => i.id)).toEqual(['anyone', 'mine']);
    expect(filterChores(items, 'mine', 'm2').map((i) => i.id)).toEqual(['anyone', 'theirs']);
    expect(filterChores(items, 'all', 'm1')).toHaveLength(3);
    expect(isMine(items[2]!, null)).toBe(false);
  });
});

describe('clearDone (AC-HOME-5)', () => {
  it('tombstones only live done items of that list', () => {
    const items = [
      makeItem('d1', 'l1', { done: true }),
      makeItem('d2', 'l1', { done: true }),
      makeItem('open', 'l1'),
      makeItem('other', 'l2', { done: true }),
      softDelete(makeItem('old', 'l1', { done: true }), '2026-11-01T00:00:00.000Z'),
    ];
    const { items: next, cleared } = clearDone(items, 'l1', NOW);
    expect(cleared).toBe(2);
    expect(next.map((i) => i.deletedAt)).toEqual([NOW, NOW, null, null, '2026-11-01T00:00:00.000Z']);
    expect(items[0]?.deletedAt).toBeNull();
  });
});

describe('itemsForList', () => {
  it('separates open and done, hides tombstones, orders sensibly', () => {
    const items = [
      makeItem('b', 'l', { createdAt: '2026-11-21T09:00:02.000Z' }),
      makeItem('a', 'l', { createdAt: '2026-11-21T09:00:01.000Z' }),
      makeItem('d1', 'l', { done: true, updatedAt: '2026-11-21T10:00:00.000Z' }),
      makeItem('d2', 'l', { done: true, updatedAt: '2026-11-21T11:00:00.000Z' }),
      softDelete(makeItem('x', 'l'), NOW),
      makeItem('o', 'other'),
    ];
    const { open, done } = itemsForList(items, 'l');
    expect(open.map((i) => i.id)).toEqual(['a', 'b']);
    expect(done.map((i) => i.id)).toEqual(['d2', 'd1']);
  });
});

describe('due soon chores (AC-HOME-9)', () => {
  const today = '2026-11-21';
  const lists = [makeList('chores', { type: 'chore' }), makeList('shop', { type: 'shopping' })];
  it('shows "2 days overdue" for a chore due 2026-11-19', () => {
    const chore = makeItem('c', 'chores', { dueDate: '2026-11-19' });
    expect(choreDaysUntil(chore, today)).toBe(-2);
    expect(choreDueText(chore, today)).toBe('2 days overdue');
  });
  it('has relative text for today, tomorrow and later, and none without a date', () => {
    expect(choreDueText(makeItem('c', 'chores', { dueDate: today }), today)).toBe('Today');
    expect(choreDueText(makeItem('c', 'chores', { dueDate: '2026-11-22' }), today)).toBe('Tomorrow');
    expect(choreDueText(makeItem('c', 'chores', { dueDate: '2026-11-23' }), today)).toBe('in 2 days');
    expect(choreDueText(makeItem('c', 'chores'), today)).toBeNull();
    expect(choreDaysUntil(makeItem('c', 'chores'), today)).toBeNull();
  });
  it('includes overdue, today and the next 2 days, for me or Anyone, most overdue first', () => {
    const items = [
      makeItem('in2', 'chores', { dueDate: '2026-11-23' }),
      makeItem('in3', 'chores', { dueDate: '2026-11-24' }),
      makeItem('overdue', 'chores', { dueDate: '2026-11-19' }),
      makeItem('today', 'chores', { dueDate: today, assigneeId: 'm1' }),
      makeItem('theirs', 'chores', { dueDate: today, assigneeId: 'm2' }),
      makeItem('done', 'chores', { dueDate: today, done: true }),
      makeItem('nodate', 'chores'),
      makeItem('shopping', 'shop', { dueDate: today }),
      softDelete(makeItem('deleted', 'chores', { dueDate: today }), T0),
    ];
    expect(dueSoonChores(items, lists, 'm1', today).map((i) => i.id)).toEqual(['overdue', 'today', 'in2']);
    expect(dueSoonChores(items, lists, 'm2', today).map((i) => i.id)).toEqual(['overdue', 'theirs', 'in2']);
  });
  it('ignores chores in deleted lists', () => {
    const gone = [softDelete(makeList('chores', { type: 'chore' }), T0)];
    expect(dueSoonChores([makeItem('c', 'chores', { dueDate: today })], gone, null, today)).toEqual([]);
  });
});

describe('members (AC-HOME-1, 8)', () => {
  it('rejects duplicate names ignoring case, on create and rename, but lets a member keep their own name', () => {
    const members = [makeMember('a', 'Anna'), makeMember('b', 'Ben')];
    expect(createMember(members, ' anna ', 'x', NOW)).toEqual({ ok: false, error: 'duplicate' });
    expect(renameMember(members, 'b', 'ANNA', NOW)).toEqual({ ok: false, error: 'duplicate' });
    const same = renameMember(members, 'b', 'ben', NOW);
    expect(same.ok && same.value.find((m) => m.id === 'b')?.name).toBe('ben');
  });

  it('renames with trimming and validation, bumping updatedAt', () => {
    const members = [makeMember('a', 'Anna')];
    expect(renameMember(members, 'a', '  ', NOW)).toEqual({ ok: false, error: 'required' });
    expect(renameMember(members, 'a', 'x'.repeat(31), NOW)).toEqual({ ok: false, error: 'too-long' });
    const r = renameMember(members, 'a', ' Annie ', '2026-12-01T00:00:00.000Z');
    expect(r.ok && r.value[0]).toMatchObject({ name: 'Annie', updatedAt: '2026-12-01T00:00:00.000Z' });
  });

  it('removing the current member moves current to the first remaining and keeps doneBy names', () => {
    const base = makeData({
      members: [makeMember('a', 'Anna'), makeMember('b', 'Ben')],
      items: [makeItem('i1', 'l', { assigneeId: 'b' }), makeItem('i2', 'l', { done: true, doneBy: { memberId: 'b', name: 'Ben' } })],
    });
    const data = { ...base, settings: { ...base.settings, currentMemberId: 'b' } };
    const next = removeMemberFromData(data, 'b', NOW);
    expect(next.settings.currentMemberId).toBe('a');
    expect(next.items.find((i) => i.id === 'i1')?.assigneeId).toBeUndefined();
    expect(next.items.find((i) => i.id === 'i2')?.doneBy).toEqual({ memberId: 'b', name: 'Ben' });
    expect(next.items).toHaveLength(2);
  });

  it('never removes the last member', () => {
    const data = makeData({ members: [makeMember('a', 'Anna')] });
    expect(removeMemberFromData(data, 'a', NOW)).toBe(data);
  });
});

describe('lists (AC-HOME-2)', () => {
  it('renames and validates', () => {
    const lists = [makeList('l1', { name: 'Old' })];
    expect(renameList(lists, 'l1', ' ', NOW)).toEqual({ ok: false, error: 'required' });
    const r = renameList(lists, 'l1', ' New ', NOW);
    expect(r.ok && r.value[0]?.name).toBe('New');
  });

  it('deleting a list tombstones its live items and Undo restores exactly those', () => {
    const lists = [makeList('l1'), makeList('l2')];
    const items = [makeItem('a', 'l1'), softDelete(makeItem('gone', 'l1'), T0), makeItem('b', 'l2')];
    const deleted = deleteList(lists, items, 'l1', NOW);
    expect(deleted.lists[0]?.deletedAt).toBe(NOW);
    expect(deleted.itemIds).toEqual(['a']);
    expect(deleted.items.find((i) => i.id === 'a')?.deletedAt).toBe(NOW);
    expect(deleted.items.find((i) => i.id === 'gone')?.deletedAt).toBe(T0);
    expect(deleted.items.find((i) => i.id === 'b')?.deletedAt).toBeNull();
    const back = restoreListItems(deleted.lists, deleted.items, 'l1', deleted.itemIds, NOW);
    expect(back.lists[0]?.deletedAt).toBeNull();
    expect(back.items.find((i) => i.id === 'a')?.deletedAt).toBeNull();
    expect(back.items.find((i) => i.id === 'gone')?.deletedAt).toBe(T0);
  });

  it('clearDone reports the ids it removed', () => {
    const items = [makeItem('a', 'l', { done: true }), makeItem('b', 'l')];
    const r = clearDone(items, 'l', NOW);
    expect(r.ids).toEqual(['a']);
    expect(r.cleared).toBe(1);
  });
});

describe('editItem (AC-HOME-6)', () => {
  it('applies the sheet and clears fields that are unset', () => {
    const item = makeItem('i', 'l', { qty: '2 x', assigneeId: 'a', dueDate: '2026-11-22', repeat: 'weekly' });
    expect(editItem(item, { title: ' ' }, NOW)).toBeNull();
    const next = editItem(item, { title: ' Bins ', assigneeId: 'b', dueDate: '2026-11-25', repeat: 'none' }, '2026-12-01T00:00:00.000Z');
    expect(next).toMatchObject({ title: 'Bins', assigneeId: 'b', dueDate: '2026-11-25', updatedAt: '2026-12-01T00:00:00.000Z' });
    expect(next).not.toHaveProperty('qty');
    expect(next).not.toHaveProperty('repeat');
    const cleared = editItem(item, { title: 'x' }, NOW);
    expect(cleared).not.toHaveProperty('assigneeId');
    expect(cleared).not.toHaveProperty('dueDate');
  });
});

describe('list display helpers', () => {
  it('orders shopping newest first and chores by due date with undated last', () => {
    const a = makeItem('a', 'l');
    const b = makeItem('b', 'l');
    const c = makeItem('c', 'l', { dueDate: '2026-11-25' });
    const d = makeItem('d', 'l', { dueDate: '2026-11-22' });
    expect(orderOpenItems([a, b], 'shopping').map((i) => i.id)).toEqual(['b', 'a']);
    expect(orderOpenItems([a, b, c, d], 'chore').map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('classifies chores: overdue, soon (today to +2 days), later, none', () => {
    const today = '2026-11-21';
    expect(choreUrgency(makeItem('i', 'l', { dueDate: '2026-11-19' }), today)).toBe('overdue');
    expect(choreUrgency(makeItem('i', 'l', { dueDate: '2026-11-21' }), today)).toBe('soon');
    expect(choreUrgency(makeItem('i', 'l', { dueDate: '2026-11-23' }), today)).toBe('soon');
    expect(choreUrgency(makeItem('i', 'l', { dueDate: '2026-11-24' }), today)).toBe('later');
    expect(choreUrgency(makeItem('i', 'l'), today)).toBe('none');
  });

  it('summarises a list the same way Today does (mine or Anyone, open only)', () => {
    const today = '2026-11-21';
    const list = makeList('c', { type: 'chore' });
    const items = [
      makeItem('1', 'c', { dueDate: '2026-11-19' }),
      makeItem('2', 'c', { dueDate: '2026-11-22', assigneeId: 'other' }),
      makeItem('3', 'c', { dueDate: '2026-11-22', assigneeId: 'me' }),
      makeItem('4', 'c', { done: true, dueDate: '2026-11-19' }),
      makeItem('5', 'c'),
    ];
    expect(listSummary(items, list, 'me', today)).toEqual({ open: 4, dueSoon: 2, overdue: 1 });
    expect(listSummary(items, makeList('s', { type: 'shopping' }), 'me', today)).toEqual({ open: 0, dueSoon: 0, overdue: 0 });
  });
});
