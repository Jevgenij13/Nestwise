import { describe, expect, it } from 'vitest';
import { softDelete } from './entities.ts';
import { applyListImport, importSummaryText, parseSharedText, previewListImport } from './shareOps.ts';
import { createListSnapshot, encodeCompressedShareCode, encodeShareCode } from './snapshot.ts';
import { makeData, makeItem, makeList, makeMember } from './test-fixtures.ts';
import type { AppData } from '../types.ts';

const NOW = '2026-11-21T12:00:00.000Z';
const LATER = '2026-11-22T12:00:00.000Z';

/** Phone A has a Shopping list; phone B has nothing yet. */
function phoneA(): AppData {
  return makeData({
    members: [makeMember('ma', 'Anna')],
    lists: [makeList('shop', { name: 'Shopping' })],
    items: [makeItem('milk', 'shop', { title: 'Milk' }), makeItem('bread', 'shop', { title: 'Bread' }), makeItem('eggs', 'shop', { title: 'Eggs', done: true, doneBy: { memberId: 'ma', name: 'Anna' } })],
  });
}
const phoneB = (): AppData => makeData({ members: [makeMember('mb', 'Ben')] });
const codeOf = (data: AppData, now = NOW) => encodeShareCode(createListSnapshot(data, 'shop', now)!);

async function importInto(local: AppData, code: string, now: string): Promise<AppData> {
  const preview = await previewListImport(local, code, now);
  if (!preview.ok) throw new Error(preview.error.message);
  return applyListImport(local, preview.value, now);
}

describe('previewListImport (AC-HOME-11)', () => {
  it('counts new items and flags a new list', async () => {
    const r = await previewListImport(phoneB(), codeOf(phoneA()), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ listName: 'Shopping', listIsNew: true, upToDate: false, newMembers: ['Anna'] });
    expect(importSummaryText(r.value.items)).toBe('3 new, 0 updated, 0 deleted');
  });

  it('reports "3 new, 2 updated, 1 deleted" for a changed list', async () => {
    const a = phoneA();
    const b = await importInto(phoneB(), codeOf(a), NOW);
    // A then edits two items, deletes one and adds three new ones.
    const changed: AppData = {
      ...a,
      items: [
        { ...a.items[0]!, title: 'Oat milk', updatedAt: LATER },
        { ...a.items[1]!, done: true, updatedAt: LATER },
        softDelete(a.items[2]!, LATER),
        makeItem('n1', 'shop', { createdAt: LATER, updatedAt: LATER }),
        makeItem('n2', 'shop', { createdAt: LATER, updatedAt: LATER }),
        makeItem('n3', 'shop', { createdAt: LATER, updatedAt: LATER }),
      ],
    };
    const r = await previewListImport(b, codeOf(changed, LATER), LATER);
    expect(r.ok && importSummaryText(r.value.items)).toBe('3 new, 2 updated, 1 deleted');
  });

  it('round trip: merge, then importing the same snapshot again changes nothing', async () => {
    const code = codeOf(phoneA());
    const merged = await importInto(phoneB(), code, NOW);
    expect(merged.items.filter((i) => i.listId === 'shop')).toHaveLength(3);
    expect(merged.lists.map((l) => l.id)).toEqual(['shop']);
    expect(merged.members.map((m) => m.id).sort()).toEqual(['ma', 'mb']);

    const again = await previewListImport(merged, code, NOW);
    expect(again.ok && again.value.upToDate).toBe(true);
    if (!again.ok) return;
    expect(applyListImport(merged, again.value, NOW)).toEqual(merged);
  });

  it('keeps a deletion that is newer than the incoming copy', async () => {
    const stale = codeOf(phoneA());
    const b = { ...phoneB(), lists: [makeList('shop')], items: [softDelete(makeItem('milk', 'shop'), LATER)] };
    const merged = await importInto(b, stale, LATER);
    expect(merged.items.find((i) => i.id === 'milk')?.deletedAt).toBe(LATER);
  });

  it('refuses to exceed the list and member limits and changes nothing', async () => {
    const full = makeData({ lists: Array.from({ length: 20 }, (_, i) => makeList(`x${i}`)) });
    const tooManyLists = await previewListImport(full, codeOf(phoneA()), NOW);
    expect(!tooManyLists.ok && tooManyLists.error.message).toContain('20 lists');
    const crowded = makeData({ members: Array.from({ length: 8 }, (_, i) => makeMember(`p${i}`)) });
    const tooManyPeople = await previewListImport(crowded, codeOf(phoneA()), NOW);
    expect(!tooManyPeople.ok && tooManyPeople.error.message).toContain('8 people');
  });
});

describe('parseSharedText', () => {
  const snapshot = () => createListSnapshot(phoneA(), 'shop', NOW)!;

  it('reads a JSON file, a bare code, a code wrapped in text or a link, and a compressed code', async () => {
    const json = JSON.stringify(snapshot());
    const code = encodeShareCode(snapshot());
    const compressed = await encodeCompressedShareCode(snapshot());
    for (const text of [json, code, `  ${code.slice(0, 30)}\n${code.slice(30)}  `, `Here is my list: ${code}`, `https://example.com/app/#/shared/${compressed}`, compressed]) {
      const r = await parseSharedText(text);
      expect(r.ok && r.value.lists?.[0]?.id).toBe('shop');
    }
  });

  it('rejects empty, foreign, damaged, truncated and full-backup input with a clear error', async () => {
    const bad = async (text: string) => {
      const r = await parseSharedText(text);
      return r.ok ? null : r.error.code;
    };
    expect(await bad('')).toBe('not-nestwise');
    expect(await bad('hello')).toBe('not-json');
    expect(await bad('{"app":"other"}')).toBe('not-nestwise');
    expect(await bad(encodeShareCode(snapshot()).slice(0, 40))).not.toBeNull();
    expect(await bad('NW2.!!!')).toBe('bad-code');
    expect(await bad('NW2.AAAAAAAA')).toBe('bad-code');
    const full = JSON.stringify({ app: 'nestwise', schemaVersion: 1, exportedAt: NOW, scope: 'all', data: phoneA() });
    expect((await parseSharedText(full)).ok).toBe(false);
  });

  it('rejects a newer schema version', async () => {
    const newer = JSON.stringify({ ...snapshot(), schemaVersion: 999 });
    const r = await parseSharedText(newer);
    expect(!r.ok && r.error.code).toBe('newer-version');
  });
});
