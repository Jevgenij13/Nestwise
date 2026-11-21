import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { UNDO_MS } from '../lib/limits.ts';
import { Toast } from '../components/Toast.tsx';

export interface ToastOptions {
  message: string;
  /** With an action the toast lasts 5 seconds (Undo window, AC-BILL-7); without, 2.5 seconds. */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastApi {
  show(options: ToastOptions): void;
  dismiss(): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const PLAIN_MS = 2500;

interface Active extends ToastOptions {
  id: number;
  durationMs: number;
}

/** One toast at a time; a new one replaces the previous (DESIGN 4.7). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => setActive(null), []);
  const show = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    setActive({ ...options, id: idRef.current, durationMs: options.actionLabel ? UNDO_MS : PLAIN_MS });
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive((current) => (current?.id === active.id ? null : current)), active.durationMs);
    return () => window.clearTimeout(timer);
  }, [active]);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {active && (
        <Toast
          key={active.id}
          message={active.message}
          actionLabel={active.actionLabel}
          durationMs={active.durationMs}
          onAction={() => {
            active.onAction?.();
            dismiss();
          }}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
