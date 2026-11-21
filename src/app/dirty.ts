import { useEffect, useSyncExternalStore } from 'react';

/**
 * Counts open forms with unsaved input, so the update banner can wait instead of reloading
 * the page under the user (AC-APP-11: "without losing unsaved input").
 */
let count = 0;
const listeners = new Set<() => void>();

function change(delta: number) {
  count += delta;
  for (const listener of listeners) listener();
}

export function useHasUnsavedInput(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count > 0,
  );
}

/** Call from a form: reports `dirty` while mounted. */
export function useReportDirty(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    change(1);
    return () => change(-1);
  }, [dirty]);
}
