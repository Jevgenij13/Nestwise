import { useSyncExternalStore } from 'react';

/** Only one row shows its swipe actions at a time; tapping elsewhere closes it (DESIGN 4.2). */
let openId: string | null = null;
const listeners = new Set<() => void>();

function set(id: string | null) {
  if (openId === id) return;
  openId = id;
  for (const listener of listeners) listener();
}

function onDocumentPointerDown(e: PointerEvent) {
  if (openId === null) return;
  const row = (e.target as Element | null)?.closest('[data-row-id]');
  if (row?.getAttribute('data-row-id') !== openId) set(null);
}

export const swipeRows = {
  open: (id: string) => set(id),
  close: () => set(null),
};

export function useRowOpen(id: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      if (listeners.size === 0) document.addEventListener('pointerdown', onDocumentPointerDown, true);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      };
    },
    () => openId === id,
  );
}
