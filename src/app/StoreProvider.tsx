import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { AppData, DateString } from '../types.ts';
import { formatMoney } from '../lib/money.ts';
import { deviceLocale } from './locale.ts';
import type { AppStore, StoreState } from './store.ts';

const StoreContext = createContext<AppStore | null>(null);

const MIDNIGHT_CHECK_MS = 60_000;

/**
 * Provides the store and keeps "today" fresh: on return to foreground, focus, bfcache restore and
 * once a minute while open, so a day change never leaves stale Due soon lists (AC-BILL-9).
 */
export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  useEffect(() => {
    const refresh = () => store.refreshToday();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    const timer = window.setInterval(refresh, MIDNIGHT_CHECK_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.clearInterval(timer);
    };
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/** Subscribes to a slice of state. The selector must return a stable value (a field, not a new object). */
export function useAppState<T>(selector: (state: StoreState) => T): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export const useAppData = (): AppData => useAppState((s) => s.data);
export const useToday = (): DateString => useAppState((s) => s.today);
export const useCurrency = (): string => useAppState((s) => s.data.settings.currency);

/** Formats minor units in the default currency with the device locale. */
export function useMoney(): (minor: number) => string {
  const currency = useCurrency();
  return (minor) => formatMoney(minor, currency, deviceLocale());
}
