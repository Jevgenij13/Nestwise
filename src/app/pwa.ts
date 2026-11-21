import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Service worker registration with the "prompt" strategy (AC-APP-11): a new version is downloaded in the
 * background and the app only reloads when the user taps Reload. In dev there is no service worker.
 */
export function usePwaUpdate(): { updateReady: boolean; reload: () => void } {
  const [updateReady, setUpdateReady] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      updateRef.current = registerSW({
        immediate: true,
        onNeedRefresh: () => setUpdateReady(true),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => {
    void updateRef.current?.(true);
  }, []);

  return { updateReady, reload };
}
