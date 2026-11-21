import type { AppData, IsoTimestamp, Settings } from '../types.ts';
import { purgeTombstones } from './entities.ts';
import { CURRENT_SCHEMA_VERSION } from './migrations.ts';
import { createEnvelope, parseEnvelope, type EnvelopeErrorCode } from './snapshot.ts';

/**
 * Local-first persistence behind a tiny typed layer. All data lives under one key as a versioned envelope
 * (the same format as a backup), so load = parse + validate + migrate. Every storage access is wrapped:
 * private mode, blocked storage or a full quota never throws into the UI.
 */

export const STORAGE_KEY = 'nestwise.data';
export const CORRUPT_KEY = 'nestwise.data.corrupt';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultSettings(currency = 'USD'): Settings {
  return {
    currency,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    defaultLeadDays: 3,
    appearance: 'system',
    currentMemberId: null,
    badgeEnabled: false,
    lastBackupAt: null,
    onboardingDone: false,
  };
}

export function emptyData(currency?: string): AppData {
  return { settings: defaultSettings(currency), household: null, members: [], bills: [], lists: [], items: [], goals: [] };
}

/** `window.localStorage` if usable, else null (access can throw, e.g. blocked site data). */
export function browserStorage(): StorageBackend | null {
  try {
    const store = globalThis.localStorage as StorageBackend | undefined;
    if (!store) return null;
    const probe = `${STORAGE_KEY}.probe`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export type LoadResult =
  /** Nothing stored yet: first run. `data` is the empty default. */
  | { status: 'empty'; data: AppData }
  | { status: 'ok'; data: AppData }
  /** Stored data is unreadable. The raw text was copied to CORRUPT_KEY (best effort) and is not overwritten until `save` is called. */
  | { status: 'corrupt'; data: AppData; code: EnvelopeErrorCode }
  /** Stored by a newer app version. The caller must not call `save`, so the newer data is never overwritten. */
  | { status: 'newer'; data: AppData };

export interface Storage {
  /** False when the browser storage is unavailable and data lives in memory only. */
  readonly persistent: boolean;
  load(now?: IsoTimestamp): LoadResult;
  /** Returns false if the write failed (quota or blocked storage). */
  save(data: AppData, now: IsoTimestamp): boolean;
  /** Removes all stored data ("Erase all data"). */
  clear(): boolean;
}

export function createStorage(backend: StorageBackend | null = browserStorage()): Storage {
  // In-memory fallback keeps the app usable for the session when persistence is unavailable.
  let memory: string | null = null;

  const read = (key: string): string | null => {
    if (!backend) return key === STORAGE_KEY ? memory : null;
    try {
      return backend.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string): boolean => {
    if (!backend) {
      if (key === STORAGE_KEY) memory = value;
      return false;
    }
    try {
      backend.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };

  return {
    persistent: backend !== null,
    load(now = new Date().toISOString()) {
      const raw = read(STORAGE_KEY);
      if (raw === null) return { status: 'empty', data: emptyData() };
      const parsed = parseEnvelope(raw);
      if (parsed.ok && parsed.value.scope === 'all') return { status: 'ok', data: purgeTombstones(parsed.value.data, now) };
      const code = parsed.ok ? 'invalid' : parsed.error.code;
      if (code === 'newer-version') return { status: 'newer', data: emptyData() };
      write(CORRUPT_KEY, raw);
      return { status: 'corrupt', data: emptyData(), code };
    },
    save(data, now) {
      return write(STORAGE_KEY, JSON.stringify(createEnvelope('all', data, now)));
    },
    clear() {
      if (!backend) {
        memory = null;
        return false;
      }
      try {
        backend.removeItem(STORAGE_KEY);
        backend.removeItem(CORRUPT_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}
