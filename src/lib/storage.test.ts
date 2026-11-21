import { afterEach, describe, expect, it, vi } from 'vitest';
import { softDelete } from './entities.ts';
import { CURRENT_SCHEMA_VERSION } from './migrations.ts';
import { createEnvelope } from './snapshot.ts';
import { browserStorage, CORRUPT_KEY, createStorage, defaultSettings, emptyData, STORAGE_KEY, type StorageBackend } from './storage.ts';
import { makeBill, sampleData } from './test-fixtures.ts';

const NOW = '2026-11-21T12:00:00.000Z';

function memoryBackend(initial: Record<string, string> = {}): StorageBackend & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('defaults', () => {
  it('has sensible first-run settings (AC-APP-4)', () => {
    expect(defaultSettings()).toMatchObject({ currency: 'USD', defaultLeadDays: 3, appearance: 'system', badgeEnabled: false, onboardingDone: false, currentMemberId: null, lastBackupAt: null, schemaVersion: CURRENT_SCHEMA_VERSION });
    expect(emptyData('EUR')).toMatchObject({ household: null, members: [], bills: [], lists: [], items: [], goals: [] });
    expect(emptyData('EUR').settings.currency).toBe('EUR');
  });
});

describe('createStorage', () => {
  it('reports "empty" on first run', () => {
    const s = createStorage(memoryBackend());
    expect(s.persistent).toBe(true);
    expect(s.load(NOW)).toEqual({ status: 'empty', data: emptyData() });
  });

  it('saves and loads data identically (survives an app restart)', () => {
    const backend = memoryBackend();
    expect(createStorage(backend).save(sampleData(), NOW)).toBe(true);
    const loaded = createStorage(backend).load(NOW);
    expect(loaded.status).toBe('ok');
    expect(loaded.data).toEqual(sampleData());
  });

  it('stores one versioned envelope under a single key', () => {
    const backend = memoryBackend();
    createStorage(backend).save(sampleData(), NOW);
    expect([...backend.map.keys()]).toEqual([STORAGE_KEY]);
    expect(JSON.parse(backend.map.get(STORAGE_KEY)!)).toMatchObject({ app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION, scope: 'all' });
  });

  it('purges tombstones older than 30 days on load', () => {
    const data = sampleData();
    data.bills.push(softDelete(makeBill('old'), '2026-09-01T00:00:00.000Z'), softDelete(makeBill('recent'), '2026-11-15T00:00:00.000Z'));
    const backend = memoryBackend();
    createStorage(backend).save(data, NOW);
    const loaded = createStorage(backend).load(NOW);
    expect(loaded.data.bills.map((b) => b.id)).toEqual(['b1', 'b2', 'recent']);
  });

  it('treats corrupt JSON as "corrupt", keeps a copy of the raw text, and returns empty data', () => {
    const backend = memoryBackend({ [STORAGE_KEY]: '{"app":"nestwise", broken' });
    const loaded = createStorage(backend).load(NOW);
    expect(loaded).toMatchObject({ status: 'corrupt', code: 'not-json', data: emptyData() });
    expect(backend.map.get(CORRUPT_KEY)).toBe('{"app":"nestwise", broken');
    expect(backend.map.get(STORAGE_KEY)).toBe('{"app":"nestwise", broken');
  });

  it('treats structurally invalid data as corrupt', () => {
    const env = createEnvelope('all', { ...sampleData(), bills: 'oops' }, NOW);
    const loaded = createStorage(memoryBackend({ [STORAGE_KEY]: JSON.stringify(env) })).load(NOW);
    expect(loaded).toMatchObject({ status: 'corrupt', code: 'invalid' });
  });

  it('refuses data from a newer schema without copying or overwriting it', () => {
    const raw = JSON.stringify({ ...createEnvelope('all', sampleData(), NOW), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });
    const backend = memoryBackend({ [STORAGE_KEY]: raw });
    const loaded = createStorage(backend).load(NOW);
    expect(loaded.status).toBe('newer');
    expect(backend.map.get(STORAGE_KEY)).toBe(raw);
    expect(backend.map.has(CORRUPT_KEY)).toBe(false);
  });

  it('a single-list snapshot stored under the data key is corrupt, not silently accepted', () => {
    const env = createEnvelope('list', { lists: [], items: [], members: [] }, NOW);
    expect(createStorage(memoryBackend({ [STORAGE_KEY]: JSON.stringify(env) })).load(NOW).status).toBe('corrupt');
  });

  it('clear removes data (Erase all data)', () => {
    const backend = memoryBackend();
    const s = createStorage(backend);
    s.save(sampleData(), NOW);
    expect(s.clear()).toBe(true);
    expect(backend.map.size).toBe(0);
    expect(s.load(NOW).status).toBe('empty');
  });
});

describe('fails safe', () => {
  const throwing = (): StorageBackend => ({
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new DOMException('full', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  });

  it('never throws when storage throws; save and clear return false, load returns empty', () => {
    const s = createStorage(throwing());
    expect(() => s.load(NOW)).not.toThrow();
    expect(s.load(NOW).status).toBe('empty');
    expect(s.save(sampleData(), NOW)).toBe(false);
    expect(s.clear()).toBe(false);
  });

  it('quota errors on save do not lose previously stored data', () => {
    const backend = memoryBackend();
    createStorage(backend).save(sampleData(), NOW);
    const failing: StorageBackend = { ...backend, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(createStorage(failing).save(emptyData(), NOW)).toBe(false);
    expect(createStorage(backend).load(NOW).data).toEqual(sampleData());
  });

  it('without any backend it keeps data in memory for the session and says it is not persistent', () => {
    const s = createStorage(null);
    expect(s.persistent).toBe(false);
    expect(s.load(NOW).status).toBe('empty');
    expect(s.save(sampleData(), NOW)).toBe(false);
    expect(s.load(NOW).data).toEqual(sampleData());
    s.clear();
    expect(s.load(NOW).status).toBe('empty');
  });

  it('browserStorage returns null when localStorage is missing or throws on access', () => {
    expect(browserStorage()).toBeNull();
    vi.stubGlobal('localStorage', undefined);
    expect(browserStorage()).toBeNull();
    vi.stubGlobal('localStorage', throwing());
    expect(browserStorage()).toBeNull();
  });

  it('browserStorage returns a working store when localStorage is usable', () => {
    const backend = memoryBackend();
    vi.stubGlobal('localStorage', backend);
    const store = browserStorage();
    expect(store).toBe(backend);
    expect(backend.map.size).toBe(0);
  });
});
