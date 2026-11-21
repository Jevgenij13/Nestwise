import { describe, expect, it } from 'vitest';
import { isLive, newId, nowIso, purgeTombstones, restore, softDelete, tombstoneExpired, updateEntity } from './entities.ts';
import { makeBill, makeData, makeItem, makeList, T0 } from './test-fixtures.ts';

const NOW = '2026-12-21T09:00:00.000Z';

describe('newId', () => {
  it('generates unique UUID-shaped ids', () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('falls back when randomUUID is unavailable', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});

describe('nowIso', () => {
  it('returns an ISO timestamp', () => {
    expect(nowIso(new Date('2026-11-21T09:00:00Z'))).toBe('2026-11-21T09:00:00.000Z');
  });
});

describe('updateEntity / softDelete / restore', () => {
  const bill = makeBill('b');
  it('updateEntity patches and bumps updatedAt only', () => {
    const next = updateEntity(bill, { name: 'New' }, NOW);
    expect(next).toMatchObject({ name: 'New', updatedAt: NOW, createdAt: T0, id: 'b' });
    expect(bill.name).toBe('Bill b');
  });
  it('softDelete sets a tombstone and bumps updatedAt so it wins merges', () => {
    const gone = softDelete(bill, NOW);
    expect(gone.deletedAt).toBe(NOW);
    expect(gone.updatedAt).toBe(NOW);
    expect(isLive(gone)).toBe(false);
  });
  it('restore (Undo) brings the entity back unchanged apart from timestamps', () => {
    const back = restore(softDelete(bill, NOW), '2026-12-21T09:00:03.000Z');
    expect(back).toEqual({ ...bill, updatedAt: '2026-12-21T09:00:03.000Z' });
    expect(isLive(back)).toBe(true);
  });
});

describe('purgeTombstones (D11: 30 days)', () => {
  const day = 86_400_000;
  const ago = (days: number) => new Date(Date.parse(NOW) - days * day).toISOString();
  it('keeps tombstones up to 30 days and drops older ones', () => {
    const data = makeData({
      bills: [softDelete(makeBill('keep29'), ago(29)), softDelete(makeBill('keep30'), ago(30)), softDelete(makeBill('drop31'), ago(31)), makeBill('live')],
      lists: [makeList('l')],
      items: [softDelete(makeItem('old', 'l'), ago(90)), makeItem('live', 'l')],
    });
    const purged = purgeTombstones(data, NOW);
    expect(purged.bills.map((b) => b.id)).toEqual(['keep29', 'keep30', 'live']);
    expect(purged.items.map((i) => i.id)).toEqual(['live']);
    expect(data.bills).toHaveLength(4);
  });
  it('never drops live entities', () => {
    expect(tombstoneExpired(makeBill('a'), NOW)).toBe(false);
  });
  it('drops an expired household tombstone', () => {
    const data = makeData({ household: softDelete({ id: 'h', name: 'H', createdAt: T0, updatedAt: T0, deletedAt: null }, ago(40)) });
    expect(purgeTombstones(data, NOW).household).toBeNull();
  });
});
