import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Everything presented over the tabs (sheets). Screens ask for an overlay with `open({kind, ...})`;
 * `OverlayHost` renders it. Each kind has one line in the OverlayHost registry. Only the top overlay is rendered.
 */
export type Overlay =
  | { kind: 'settings'; page?: 'install' | 'backup' | 'import' | 'import-list' }
  | { kind: 'bill-form'; billId?: string }
  | { kind: 'bill-detail'; billId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'members'; page?: 'switch' | 'manage' }
  | { kind: 'list-form'; listId?: string }
  | { kind: 'list-menu'; listId: string }
  | { kind: 'share-list'; listId: string }
  | { kind: 'goal'; goalId?: string };

interface OverlayApi {
  stack: readonly Overlay[];
  /** Pushes an overlay on top of the current one. */
  open: (overlay: Overlay) => void;
  /** Swaps the top overlay (detail -> edit). */
  replace: (overlay: Overlay) => void;
  /** Closes the top overlay. */
  close: () => void;
  /** Closes every overlay (e.g. before navigating to another screen). */
  closeAll: () => void;
}

const OverlayContext = createContext<OverlayApi | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<readonly Overlay[]>([]);
  const open = useCallback((overlay: Overlay) => setStack((s) => [...s, overlay]), []);
  const replace = useCallback((overlay: Overlay) => setStack((s) => [...s.slice(0, -1), overlay]), []);
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const closeAll = useCallback(() => setStack([]), []);
  const api = useMemo(() => ({ stack, open, replace, close, closeAll }), [stack, open, replace, close, closeAll]);
  return <OverlayContext.Provider value={api}>{children}</OverlayContext.Provider>;
}

export function useOverlays(): OverlayApi {
  const api = useContext(OverlayContext);
  if (!api) throw new Error('useOverlays must be used inside OverlayProvider');
  return api;
}
