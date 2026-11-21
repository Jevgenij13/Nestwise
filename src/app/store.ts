import type { AppData, DateString, IsoTimestamp } from '../types.ts';
import { emptyData, type Storage } from '../lib/storage.ts';
import { localToday } from '../lib/dates.ts';
import { newId } from '../lib/entities.ts';
import { currencyForLocale } from '../lib/region.ts';
import type { EnvelopeErrorCode } from '../lib/snapshot.ts';

/**
 * The app store: one immutable state object, replaced on every change, consumed with useSyncExternalStore.
 * It owns persistence: every `update` is saved immediately (AC-APP-7) except when the stored data came from
 * a newer app version, which is never overwritten (phase-1 note on `LoadResult.status === 'newer'`).
 */

/** ready = normal. corrupt = stored data unreadable (user must choose). newer = written by a newer app (read-only, never saved). */
export type Phase = 'ready' | 'corrupt' | 'newer';
export type PersistState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface StoreState {
  phase: Phase;
  corruptCode: EnvelopeErrorCode | null;
  data: AppData;
  /** Local calendar date; recomputed on foreground (AC-BILL-9). */
  today: DateString;
  /** False when browser storage is unavailable and data lives in memory only. */
  storageAvailable: boolean;
  /** True after a failed write (quota or blocked storage); cleared by the next successful write. */
  saveFailed: boolean;
  persist: PersistState;
}

export interface UpdateContext {
  now: IsoTimestamp;
  today: DateString;
  newId: () => string;
}

export type Mutator = (data: AppData, ctx: UpdateContext) => AppData;

export interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

export interface StoreOptions {
  storage: Storage;
  clock?: () => Date;
  locales?: readonly string[];
  storageManager?: StorageManagerLike | null;
  idFactory?: () => string;
}

export interface AppStore {
  getState(): StoreState;
  subscribe(listener: () => void): () => void;
  /** Applies a mutation and persists it. Ignored unless phase is 'ready'. */
  update(mutator: Mutator): void;
  /** Recomputes today from the clock; no-op (same state) if the date did not change. */
  refreshToday(): void;
  /** Corrupt recovery or import: replaces everything and leaves the corrupt/newer phase for the new data. */
  replaceAll(data: AppData): void;
  /** "Erase all data" (AC-APP-4): clears storage and returns to first-run state. */
  erase(): void;
  /** Asks the browser for persistent storage (AC-APP-7); updates `persist`. */
  requestPersistence(): Promise<void>;
}

export function createAppStore(options: StoreOptions): AppStore {
  const { storage, clock = () => new Date(), locales = [], idFactory = newId } = options;
  const storageManager = options.storageManager ?? null;
  const listeners = new Set<() => void>();

  const firstRunData = () => emptyData(currencyForLocale(locales));
  const loaded = storage.load(clock().toISOString());
  const initialData = loaded.status === 'empty' ? firstRunData() : loaded.data;

  let state: StoreState = {
    phase: loaded.status === 'corrupt' ? 'corrupt' : loaded.status === 'newer' ? 'newer' : 'ready',
    corruptCode: loaded.status === 'corrupt' ? loaded.code : null,
    data: initialData,
    today: localToday(clock()),
    storageAvailable: storage.persistent,
    saveFailed: false,
    persist: 'unknown',
  };

  const set = (patch: Partial<StoreState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const save = (data: AppData, now: IsoTimestamp): boolean => storage.save(data, now);

  const apply = (data: AppData, now: IsoTimestamp, extra: Partial<StoreState> = {}) => {
    const saved = save(data, now);
    // With no browser storage `save` returns false by design; that is reported through `storageAvailable`, not as a failed write.
    set({ ...extra, data, saveFailed: storage.persistent ? !saved : false });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(mutator) {
      if (state.phase !== 'ready') return;
      const date = clock();
      const now = date.toISOString();
      const next = mutator(state.data, { now, today: localToday(date), newId: idFactory });
      if (next === state.data) return;
      apply(next, now);
    },
    refreshToday() {
      const today = localToday(clock());
      if (today !== state.today) set({ today });
    },
    replaceAll(data) {
      apply(data, clock().toISOString(), { phase: 'ready', corruptCode: null, today: localToday(clock()) });
    },
    erase() {
      storage.clear();
      set({ phase: 'ready', corruptCode: null, data: firstRunData(), saveFailed: false, today: localToday(clock()) });
    },
    async requestPersistence() {
      if (!storageManager?.persist) {
        set({ persist: 'unsupported' });
        return;
      }
      try {
        const already = (await storageManager.persisted?.()) ?? false;
        const granted = already || (await storageManager.persist());
        set({ persist: granted ? 'granted' : 'denied' });
      } catch {
        set({ persist: 'unsupported' });
      }
    },
  };
}
