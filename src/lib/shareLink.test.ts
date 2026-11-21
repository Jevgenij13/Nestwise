import { describe, expect, it } from 'vitest';
import { newId } from './entities.ts';
import { buildShareLink, codeFromPath, qrMatrix } from './shareLink.ts';
import { encodeCompressedShareCode, encodeShareCode, createListSnapshot } from './snapshot.ts';
import { makeData, makeItem, makeList, makeMember } from './test-fixtures.ts';
import { parseSharedText } from './shareOps.ts';

const PAGE = 'https://example.github.io/nestwise/';

/** A shopping list built the way quick add builds it: random ids, timestamps a few seconds apart. */
function shoppingList(count: number) {
  const start = Date.parse('2026-11-21T09:00:00.000Z');
  const items = Array.from({ length: count }, (_, i) => {
    const at = new Date(start + i * 7_300 + (i % 7) * 113).toISOString();
    return makeItem(newId(), 'shop', { title: ['Milk', 'Bread', 'Eggs', 'Pasta', 'Tomatoes', 'Coffee', 'Apples'][i % 7]!, qty: i % 4 === 0 ? '2 x' : undefined, createdAt: at, updatedAt: at, done: i % 6 === 0 });
  });
  return makeData({ members: [makeMember('m1', 'Me')], lists: [makeList('shop', { name: 'Shopping' })], items });
}

describe('share links', () => {
  it('builds a link with the code in the fragment and reads the code back from the landing path', () => {
    const link = buildShareLink('NW2.abc_-123', `${PAGE}?x=1#/today`);
    expect(link).toBe(`${PAGE}?x=1#/shared/NW2.abc_-123`);
    expect(codeFromPath('/shared/NW2.abc_-123')).toBe('NW2.abc_-123');
    expect(codeFromPath('/shared/NW1.abc')).toBe('NW1.abc');
    expect(codeFromPath('/shared/other')).toBeNull();
    expect(codeFromPath('/today')).toBeNull();
  });

  it('a compressed code is a lot shorter than the plain one and reads back as the same list', async () => {
    const data = shoppingList(50);
    const snapshot = createListSnapshot(data, 'shop', '2026-11-21T10:00:00.000Z')!;
    const plain = encodeShareCode(snapshot);
    const compact = await encodeCompressedShareCode(snapshot);
    expect(compact.length).toBeLessThan(plain.length / 3);
    const parsed = await parseSharedText(compact);
    expect(parsed.ok && parsed.value.items?.length).toBe(50);
  });
});

describe('QR code (AC-HOME-14)', () => {
  const linkFor = async (count: number) => {
    const snapshot = createListSnapshot(shoppingList(count), 'shop', '2026-11-21T10:00:00.000Z')!;
    return buildShareLink(await encodeCompressedShareCode(snapshot), PAGE);
  };

  it('encodes a small list as a QR matrix', async () => {
    const matrix = await qrMatrix(await linkFor(5));
    expect(matrix).not.toBeNull();
    expect(matrix!.dark).toHaveLength(matrix!.size ** 2);
    expect(matrix!.size).toBeLessThan(100);
  });

  it('a list of 50 items fits a QR code (version 40 or smaller)', async () => {
    const matrix = await qrMatrix(await linkFor(50));
    expect(matrix).not.toBeNull();
    expect(matrix!.size).toBeLessThanOrEqual(177);
  });

  it('returns null instead of throwing when the text is too long', async () => {
    expect(await qrMatrix('x'.repeat(4000))).toBeNull();
  });
});
