import { describe, expect, it, vi } from 'vitest';
import { createStorage, STORAGE_KEY, CORRUPT_KEY, type StorageBackend } from '../lib/storage.ts';
import { CURRENT_SCHEMA_VERSION } from '../lib/migrations.ts';
import { makeBill } from '../lib/test-fixtures.ts';
import { createAppStore } from './store.ts';

function memoryBackend(initial: Record<string, string> = {}): StorageBackend & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

const clockAt = (iso: string) => () => new Date(iso);

function build(backend = memoryBackend(), extra: Partial<Parameters<typeof createAppStore>[0]> = {}) {
  return { backend, store: createAppStore({ storage: createStorage(backend), clock: clockAt('2026-11-21T12:00:00'), locales: ['da-DK'], ...extra }) };
}

describe('first run', () => {
  it('starts empty with the currency preselected from the device locale and saves nothing yet', () => {
    const { store, backend } = build();
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().data.settings).toMatchObject({ currency: 'DKK', onboardingDone: false });
    expect(store.getState().today).toBe('2026-11-21');
    expect(backend.map.has(STORAGE_KEY)).toBe(false);
  });
});

describe('persistence', () => {
  it('saves on every update and reloads the same data', () => {
    const { store, backend } = build();
    store.update((d) => ({ ...d, bills: [makeBill('b1')] }));
    store.update((d) => ({ ...d, settings: { ...d.settings, onboardingDone: true } }));
    const reloaded = createAppStore({ storage: createStorage(backend), clock: clockAt('2026-11-22T08:00:00') });
    expect(reloaded.getState().data.bills.map((b) => b.id)).toEqual(['b1']);
    expect(reloaded.getState().data.settings.onboardingDone).toBe(true);
  });

  it('does not notify or save when the mutator returns the same data', () => {
    const { store, backend } = build();
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((d) => d);
    expect(listener).not.toHaveBeenCalled();
    expect(backend.map.has(STORAGE_KEY)).toBe(false);
  });

  it('flags a failed write and clears the flag on the next success', () => {
    const backend = memoryBackend();
    const { store } = build(backend);
    const original = backend.setItem;
    backend.setItem = () => {
      throw new Error('quota');
    };
    store.update((d) => ({ ...d, bills: [makeBill('b1')] }));
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().data.bills).toHaveLength(1);
    backend.setItem = original;
    store.update((d) => ({ ...d, bills: [] }));
    expect(store.getState().saveFailed).toBe(false);
  });

  it('works in memory when storage is unavailable and reports it', () => {
    const store = createAppStore({ storage: createStorage(null), clock: clockAt('2026-11-21T12:00:00') });
    store.update((d) => ({ ...d, bills: [makeBill('b1')] }));
    expect(store.getState()).toMatchObject({ storageAvailable: false, saveFailed: false });
    expect(store.getState().data.bills).toHaveLength(1);
  });
});

describe('stored data problems', () => {
  it('never saves over data from a newer version', () => {
    const newer = JSON.stringify({ app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION + 1, exportedAt: '2030-01-01T00:00:00.000Z', scope: 'all', data: {} });
    const { store, backend } = build(memoryBackend({ [STORAGE_KEY]: newer }));
    expect(store.getState().phase).toBe('newer');
    store.update((d) => ({ ...d, bills: [makeBill('b1')] }));
    expect(store.getState().data.bills).toHaveLength(0);
    expect(backend.map.get(STORAGE_KEY)).toBe(newer);
  });

  it('reports corrupt data, keeps a copy, and does not overwrite until replaceAll', () => {
    const { store, backend } = build(memoryBackend({ [STORAGE_KEY]: '{oops' }));
    expect(store.getState()).toMatchObject({ phase: 'corrupt', corruptCode: 'not-json' });
    expect(backend.map.get(CORRUPT_KEY)).toBe('{oops');
    store.update((d) => ({ ...d, bills: [makeBill('b1')] }));
    expect(backend.map.get(STORAGE_KEY)).toBe('{oops');
    store.replaceAll(store.getState().data);
    expect(store.getState().phase).toBe('ready');
    expect(backend.map.get(STORAGE_KEY)).not.toBe('{oops');
  });
});

describe('today', () => {
  it('recomputes when the clock crosses midnight and only then notifies', () => {
    let now = new Date('2026-11-21T23:50:00');
    const store = createAppStore({ storage: createStorage(memoryBackend()), clock: () => now });
    const listener = vi.fn();
    store.subscribe(listener);
    store.refreshToday();
    expect(listener).not.toHaveBeenCalled();
    now = new Date('2026-11-22T00:05:00');
    store.refreshToday();
    expect(store.getState().today).toBe('2026-11-22');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('erase', () => {
  it('clears storage and returns to first run', () => {
    const { store, backend } = build();
    store.update((d) => ({ ...d, bills: [makeBill('b1')], settings: { ...d.settings, onboardingDone: true } }));
    store.erase();
    expect(backend.map.has(STORAGE_KEY)).toBe(false);
    expect(store.getState().data.bills).toHaveLength(0);
    expect(store.getState().data.settings.onboardingDone).toBe(false);
  });
});

describe('requestPersistence', () => {
  it('reports granted, denied and unsupported', async () => {
    const granted = build(undefined, { storageManager: { persisted: async () => false, persist: async () => true } });
    await granted.store.requestPersistence();
    expect(granted.store.getState().persist).toBe('granted');

    const denied = build(undefined, { storageManager: { persisted: async () => false, persist: async () => false } });
    await denied.store.requestPersistence();
    expect(denied.store.getState().persist).toBe('denied');

    const none = build();
    await none.store.requestPersistence();
    expect(none.store.getState().persist).toBe('unsupported');
  });
});
