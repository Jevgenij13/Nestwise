import { describe, expect, it } from 'vitest';
import { softDelete } from './entities.ts';
import { mergeData } from './merge.ts';
import { createEnvelope, createListSnapshot, decodeShareCode, encodeShareCode, listSnapshotFilename, parseEnvelope } from './snapshot.ts';
import { makeData, makeItem, makeList, makeMember, sampleData, T0 } from './test-fixtures.ts';
import { CURRENT_SCHEMA_VERSION } from './migrations.ts';

const NOW = '2026-11-21T12:00:00.000Z';

const failureCode = (text: string) => {
  const r = parseEnvelope(text);
  return r.ok ? null : r.error.code;
};

describe('createListSnapshot (AC-HOME-10)', () => {
  it('contains the list, all its items with tombstones, and only referenced members', () => {
    const data = sampleData();
    data.members.push(makeMember('m3', 'Unrelated'));
    data.items.push(softDelete(makeItem('i3', 'l2', { title: 'Old' }), T0));
    const snap = createListSnapshot(data, 'l2', NOW);
    expect(snap).toMatchObject({ app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: NOW, scope: 'list' });
    expect(snap?.data.lists.map((l) => l.id)).toEqual(['l2']);
    expect(snap?.data.items.map((i) => i.id)).toEqual(['i2', 'i3']);
    expect(snap?.data.items.find((i) => i.id === 'i3')?.deletedAt).toBe(T0);
    expect(snap?.data.members.map((m) => m.id)).toEqual(['m1']);
  });
  it('includes assignee members of chore lists', () => {
    const snap = createListSnapshot(sampleData(), 'l1', NOW);
    expect(snap?.data.members.map((m) => m.id)).toEqual(['m2']);
  });
  it('returns null for unknown or deleted lists', () => {
    expect(createListSnapshot(sampleData(), 'nope', NOW)).toBeNull();
    const data = sampleData();
    data.lists = data.lists.map((l) => (l.id === 'l2' ? softDelete(l, T0) : l));
    expect(createListSnapshot(data, 'l2', NOW)).toBeNull();
  });
});

describe('share code', () => {
  it('round-trips a list snapshot through text', () => {
    const snap = createListSnapshot(sampleData(), 'l2', NOW)!;
    const code = encodeShareCode(snap);
    expect(code.startsWith('NW1.')).toBe(true);
    expect(code).toMatch(/^[A-Za-z0-9._-]+$/);
    const decoded = decodeShareCode(code);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.scope).toBe('list');
    expect(decoded.value.data).toEqual(snap.data);
  });

  it('tolerates whitespace and line breaks added by chat apps', () => {
    const code = encodeShareCode(createListSnapshot(sampleData(), 'l2', NOW)!);
    const wrapped = `  ${code.replace(/(.{40})/g, '$1\n')}  \n`;
    expect(decodeShareCode(wrapped).ok).toBe(true);
  });

  it('preserves non-ASCII text (emoji, Danish, Cyrillic)', () => {
    const list = makeList('l', { name: 'Indkøb 🛒' });
    const data = makeData({ lists: [list], items: [makeItem('i', 'l', { title: 'Rødgrød med fløde 🍓', qty: '2 × 500 g' }), makeItem('j', 'l', { title: 'Молоко' })] });
    const decoded = decodeShareCode(encodeShareCode(createListSnapshot(data, 'l', NOW)!));
    expect(decoded.ok && decoded.value.data.items?.map((i) => i.title)).toEqual(['Rødgrød med fløde 🍓', 'Молоко']);
    expect(decoded.ok && decoded.value.data.lists?.[0]?.name).toBe('Indkøb 🛒');
  });

  it('handles a large list (500 items)', () => {
    const items = Array.from({ length: 500 }, (_, i) => makeItem(`i${i}`, 'l', { title: `Item number ${i}` }));
    const data = makeData({ lists: [makeList('l')], items });
    const decoded = decodeShareCode(encodeShareCode(createListSnapshot(data, 'l', NOW)!));
    expect(decoded.ok && decoded.value.data.items).toHaveLength(500);
  });

  it('rejects text that is not a code, truncated codes and tampered codes with a clear error', () => {
    const code = encodeShareCode(createListSnapshot(sampleData(), 'l2', NOW)!);
    for (const bad of ['', 'hello', 'NW1.', 'NW2.abc', code.slice(0, code.length - 25), `${code}!!`, code.slice(0, 10) + '~' + code.slice(11)]) {
      const r = decodeShareCode(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.message.length).toBeGreaterThan(10);
    }
  });

  it('a newer-schema code is reported as such and changes nothing', () => {
    const env = { ...createListSnapshot(sampleData(), 'l2', NOW)!, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    const r = decodeShareCode(encodeShareCode(env));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('newer-version');
  });

  it('importing the same snapshot code twice changes nothing (AC-HOME-11)', () => {
    const sender = sampleData();
    const receiver = makeData({ members: [makeMember('m1', 'Me')], lists: [], items: [] });
    const parsed = decodeShareCode(encodeShareCode(createListSnapshot(sender, 'l2', NOW)!));
    if (!parsed.ok) throw new Error('decode failed');
    const first = mergeData(receiver, parsed.value.data, NOW);
    const second = mergeData(first.data, parsed.value.data, NOW);
    expect(first.summary.added).toBe(2); // list + item
    expect(second.data).toEqual(first.data);
    expect(second.summary.added + second.summary.updated + second.summary.deleted).toBe(0);
  });
});

describe('parseEnvelope', () => {
  const backup = () => JSON.stringify(createEnvelope('all', sampleData(), NOW));

  it('accepts a full backup', () => {
    const r = parseEnvelope(backup());
    expect(r.ok && r.value.scope).toBe('all');
    expect(r.ok && r.value.exportedAt).toBe(NOW);
  });

  it('rejects non-JSON, wrong app, and unknown scope', () => {
    expect(failureCode('not json {')).toBe('not-json');
    expect(failureCode('')).toBe('not-json');
    expect(failureCode('[]')).toBe('not-nestwise');
    expect(failureCode('null')).toBe('not-nestwise');
    expect(failureCode(JSON.stringify({ app: 'other', schemaVersion: 1 }))).toBe('not-nestwise');
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), scope: 'everything' }))).toBe('invalid');
  });

  it('rejects missing or bad schema version and export date', () => {
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), schemaVersion: undefined }))).toBe('invalid');
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), schemaVersion: '1' }))).toBe('invalid');
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), exportedAt: 'soon' }))).toBe('invalid');
  });

  it('rejects newer schema versions', () => {
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }))).toBe('newer-version');
  });

  it('rejects an old version that has no migration instead of guessing', () => {
    expect(failureCode(JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), schemaVersion: 0 }))).toBe('migration-failed');
  });

  it('rejects damaged data with a path in the message', () => {
    const env = createEnvelope('all', sampleData(), NOW) as { data: { bills: { amountMinor: unknown }[] } };
    env.data.bills[0]!.amountMinor = 'lots';
    const r = parseEnvelope(JSON.stringify(env));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('bills[0].amountMinor');
  });

  it('rejects a backup missing a collection', () => {
    const { goals: _g, ...rest } = sampleData();
    expect(failureCode(JSON.stringify(createEnvelope('all', rest, NOW)))).toBe('invalid');
  });

  it('rejects a list snapshot with zero or several lists', () => {
    const data = sampleData();
    expect(failureCode(JSON.stringify(createEnvelope('list', { lists: [], items: [], members: [] }, NOW)))).toBe('invalid');
    expect(failureCode(JSON.stringify(createEnvelope('list', { lists: data.lists, items: [], members: [] }, NOW)))).toBe('invalid');
  });

  it('rejects a list snapshot whose items point at another list', () => {
    expect(failureCode(JSON.stringify(createEnvelope('list', { lists: [makeList('l')], items: [makeItem('i', 'other')], members: [] }, NOW)))).toBe('invalid');
  });

  it('normalises settings.schemaVersion to the current version after parsing', () => {
    const data = sampleData();
    data.settings.schemaVersion = 1;
    const r = parseEnvelope(JSON.stringify(createEnvelope('all', data, NOW)));
    expect(r.ok && r.value.scope === 'all' && r.value.data.settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('listSnapshotFilename', () => {
  it('slugs the list name', () => {
    expect(listSnapshotFilename('Indkøb & Co!', '2026-11-21')).toBe('nestwise-list-indk-b-co-2026-11-21.json');
    expect(listSnapshotFilename('Shopping', '2026-11-21')).toBe('nestwise-list-shopping-2026-11-21.json');
    expect(listSnapshotFilename('🛒', '2026-11-21')).toBe('nestwise-list-list-2026-11-21.json');
  });
});
