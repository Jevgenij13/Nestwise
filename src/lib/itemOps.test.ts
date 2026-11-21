import { describe, expect, it } from 'vitest';
import { checkItem, undoItemDone } from './itemOps.ts';
import { makeData, makeItem, makeList, makeMember } from './test-fixtures.ts';

const NOW = '2026-11-21T10:00:00.000Z';

function data() {
  const base = makeData({
    members: [makeMember('m1', 'Anna')],
    lists: [makeList('l1', { type: 'chore' })],
    items: [makeItem('i1', 'l1', { dueDate: '2026-11-21' }), makeItem('i2', 'l1', { dueDate: '2026-11-21', repeat: 'weekly' })],
  });
  return { ...base, settings: { ...base.settings, currentMemberId: 'm1' } };
}

describe('checkItem', () => {
  it('stamps the current member and local date', () => {
    const { data: next } = checkItem(data(), 'i1', true, '2026-11-21', NOW, 'n1');
    expect(next.items[0]).toMatchObject({ done: true, doneAt: '2026-11-21', doneBy: { memberId: 'm1', name: 'Anna' } });
  });

  it('creates the next occurrence of a recurring chore', () => {
    const result = checkItem(data(), 'i2', true, '2026-11-21', NOW, 'n1');
    expect(result.createdId).toBe('n1');
    expect(result.data.items.at(-1)).toMatchObject({ id: 'n1', done: false, dueDate: '2026-11-28' });
  });

  it('ignores unknown or deleted items', () => {
    const d = data();
    expect(checkItem(d, 'nope', true, '2026-11-21', NOW, 'n1').data).toBe(d);
  });
});

describe('undoItemDone', () => {
  it('restores the item and removes the created occurrence', () => {
    const d = data();
    const previous = d.items[1]!;
    const { data: checked, createdId } = checkItem(d, 'i2', true, '2026-11-21', NOW, 'n1');
    const undone = undoItemDone(checked, previous, createdId, '2026-11-21T10:00:04.000Z');
    expect(undone.items[1]).toMatchObject({ done: false, deletedAt: null });
    expect(undone.items[1]?.doneBy).toBeUndefined();
    expect(undone.items.at(-1)?.deletedAt).not.toBeNull();
  });
});
