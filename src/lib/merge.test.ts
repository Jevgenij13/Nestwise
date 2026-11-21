import { describe, expect, it } from 'vitest';
import { softDelete, updateEntity } from './entities.ts';
import { mergeCollection, mergeData } from './merge.ts';
import { makeBill, makeData, makeItem, makeList, makeMember, sampleData, T0 } from './test-fixtures.ts';

const T1 = '2026-11-21T10:00:00.000Z';
const T2 = '2026-11-21T11:00:00.000Z';
const NOW = '2026-11-22T09:00:00.000Z';

describe('mergeCollection (D11)', () => {
  it('adds unknown ids, newest updatedAt wins, ties keep local', () => {
    const local = [makeItem('a', 'l', { title: 'local-a', updatedAt: T1 }), makeItem('b', 'l', { title: 'local-b', updatedAt: T1 }), makeItem('c', 'l', { title: 'local-c', updatedAt: T1 })];
    const incoming = [makeItem('a', 'l', { title: 'theirs-a', updatedAt: T2 }), makeItem('b', 'l', { title: 'theirs-b', updatedAt: T0 }), makeItem('c', 'l', { title: 'theirs-c', updatedAt: T1 }), makeItem('d', 'l', { title: 'new' })];
    const { merged, summary } = mergeCollection(local, incoming);
    expect(merged.map((i) => i.title)).toEqual(['theirs-a', 'local-b', 'local-c', 'new']);
    expect(summary).toEqual({ added: 1, updated: 1, deleted: 0, unchanged: 2 });
  });

  it('reports "3 new, 2 updated, 1 deleted" (AC-HOME-11 preview)', () => {
    const local = [makeItem('u1', 'l'), makeItem('u2', 'l'), makeItem('x', 'l'), makeItem('same', 'l')];
    const incoming = [
      makeItem('n1', 'l'),
      makeItem('n2', 'l'),
      makeItem('n3', 'l'),
      makeItem('u1', 'l', { title: 'edit', updatedAt: T1 }),
      makeItem('u2', 'l', { title: 'edit', updatedAt: T1 }),
      softDelete(makeItem('x', 'l'), T1),
      makeItem('same', 'l'),
    ];
    expect(mergeCollection(local, incoming).summary).toEqual({ added: 3, updated: 2, deleted: 1, unchanged: 1 });
  });

  it('a newer tombstone beats an older live copy and stays deleted', () => {
    const local = [makeItem('a', 'l')];
    const { merged } = mergeCollection(local, [softDelete(makeItem('a', 'l'), T1)]);
    expect(merged[0]?.deletedAt).toBe(T1);
  });

  it('an older tombstone does not delete a newer live edit', () => {
    const local = [makeItem('a', 'l', { updatedAt: T2 })];
    const { merged, summary } = mergeCollection(local, [softDelete(makeItem('a', 'l'), T1)]);
    expect(merged[0]?.deletedAt).toBeNull();
    expect(summary.unchanged).toBe(1);
  });

  it('a local tombstone is not resurrected by an older live copy', () => {
    const local = [softDelete(makeItem('a', 'l'), T1)];
    const { merged } = mergeCollection(local, [makeItem('a', 'l', { updatedAt: T0 })]);
    expect(merged[0]?.deletedAt).toBe(T1);
  });

  it('a newer live edit beats an older local tombstone and counts as new', () => {
    const local = [softDelete(makeItem('a', 'l'), T1)];
    const { merged, summary } = mergeCollection(local, [makeItem('a', 'l', { updatedAt: T2 })]);
    expect(merged[0]?.deletedAt).toBeNull();
    expect(summary.added).toBe(1);
  });

  it('stores incoming tombstones for unknown ids so older copies cannot resurrect later', () => {
    const { merged, summary } = mergeCollection([], [softDelete(makeItem('a', 'l'), T1)]);
    expect(merged).toHaveLength(1);
    expect(summary).toEqual({ added: 0, updated: 0, deleted: 0, unchanged: 1 });
  });

  it('keeps local order and appends new items', () => {
    const { merged } = mergeCollection([makeItem('b', 'l'), makeItem('a', 'l')], [makeItem('c', 'l'), makeItem('a', 'l')]);
    expect(merged.map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate its inputs', () => {
    const local = [makeItem('a', 'l')];
    const incoming = [makeItem('a', 'l', { updatedAt: T1, title: 'x' })];
    const snapshot = JSON.stringify([local, incoming]);
    mergeCollection(local, incoming);
    expect(JSON.stringify([local, incoming])).toBe(snapshot);
  });
});

describe('mergeData', () => {
  it('importing the same data twice changes nothing (AC-HOME-11)', () => {
    const local = makeData({ lists: [makeList('l')], items: [makeItem('a', 'l')] });
    const theirs = makeData({ lists: [makeList('l')], items: [makeItem('a', 'l', { title: 'edit', updatedAt: T1 }), makeItem('b', 'l'), softDelete(makeItem('c', 'l'), T1)] });
    const first = mergeData(local, theirs, NOW);
    const second = mergeData(first.data, theirs, NOW);
    expect(second.data).toEqual(first.data);
    expect(second.summary).toEqual({ added: 0, updated: 0, deleted: 0, unchanged: 3 + 1 });
  });

  it('two phones converge in either merge order', () => {
    const shared = [makeItem('milk', 'l'), makeItem('eggs', 'l'), makeItem('bread', 'l')];
    const phoneA = makeData({ lists: [makeList('l')], items: [{ ...shared[0]!, done: true, updatedAt: T1 }, shared[1]!, shared[2]!, makeItem('apples', 'l', { updatedAt: T1 })] });
    const phoneB = makeData({ lists: [makeList('l')], items: [shared[0]!, softDelete(shared[1]!, T2), { ...shared[2]!, qty: '2', updatedAt: T2 }, makeItem('tea', 'l', { updatedAt: T1 })] });
    const aThenB = mergeData(phoneA, phoneB, NOW).data;
    const bThenA = mergeData(phoneB, phoneA, NOW).data;
    const byId = (d: typeof aThenB) => Object.fromEntries(d.items.map((i) => [i.id, i]));
    expect(byId(aThenB)).toEqual(byId(bThenA));
    expect(byId(aThenB).milk?.done).toBe(true);
    expect(byId(aThenB).eggs?.deletedAt).toBe(T2);
    expect(byId(aThenB).bread?.qty).toBe('2');
    expect(Object.keys(byId(aThenB)).sort()).toEqual(['apples', 'bread', 'eggs', 'milk', 'tea']);
  });

  it('leaves collections that the incoming data lacks untouched (single-list snapshot)', () => {
    const local = sampleData();
    const { data, summary } = mergeData(local, { lists: [makeList('l1', { name: 'Chores', type: 'chore' })], items: [makeItem('new', 'l1')], members: [] }, NOW);
    expect(data.bills).toEqual(local.bills);
    expect(data.goals).toEqual(local.goals);
    expect(data.settings).toEqual(local.settings);
    expect(data.items.map((i) => i.id)).toEqual(['i1', 'i2', 'new']);
    expect(summary.added).toBe(1);
  });

  it('keeps local settings and takes the newer household name', () => {
    const local = sampleData();
    const incoming = { settings: { ...local.settings, currency: 'JPY' as const }, household: updateEntity(local.household!, { name: 'Renamed' }, T2) };
    const { data } = mergeData(local, incoming, NOW);
    expect(data.settings.currency).toBe('EUR');
    expect(data.household?.name).toBe('Renamed');
    expect(mergeData(data, { household: local.household! }, NOW).data.household?.name).toBe('Renamed');
  });

  it('adopts the incoming household when there is none locally, and ignores one with a different id', () => {
    const theirs = sampleData().household!;
    expect(mergeData(makeData(), { household: theirs }, NOW).data.household).toEqual(theirs);
    const local = sampleData();
    expect(mergeData(local, { household: { ...theirs, id: 'other', name: 'Other', updatedAt: T2 } }, NOW).data.household?.name).toBe('Home');
  });

  it('merges every collection kind', () => {
    const local = makeData({ bills: [makeBill('b')], members: [makeMember('m')] });
    const { data, summary } = mergeData(local, { bills: [makeBill('b2')], members: [makeMember('m2')], lists: [makeList('l')], goals: [] }, NOW);
    expect(data.bills).toHaveLength(2);
    expect(data.members).toHaveLength(2);
    expect(data.lists).toHaveLength(1);
    expect(summary.added).toBe(3);
  });

  it('purges tombstones older than 30 days after merging', () => {
    const old = softDelete(makeItem('old', 'l'), '2026-09-01T00:00:00.000Z');
    const { data } = mergeData(makeData({ lists: [makeList('l')] }), { items: [old, makeItem('fresh', 'l')] }, NOW);
    expect(data.items.map((i) => i.id)).toEqual(['fresh']);
  });
});
