import { OverlayProvider } from './app/overlays.tsx';
import { Shell } from './app/Shell.tsx';
import { StoreProvider, useAppData, useAppState, useStore } from './app/StoreProvider.tsx';
import { ToastProvider } from './app/toast.tsx';
import { useAppearance } from './app/theme.ts';
import { usePwaUpdate } from './app/pwa.ts';
import { useVisualViewport } from './app/viewport.ts';
import type { AppStore } from './app/store.ts';
import { useLocation } from 'react-router-dom';
import { codeFromPath } from './lib/shareLink.ts';
import { SharedLanding } from './screens/shared/SharedLanding.tsx';
import { CorruptScreen, NewerScreen } from './screens/fatal/FatalScreens.tsx';
import { Onboarding } from './screens/onboarding/Onboarding.tsx';

/** Providers, then the first-run / fatal / normal switch. The router is supplied by main.tsx (HashRouter) or by tests. */
export function App({ store }: { store: AppStore }) {
  return (
    <StoreProvider store={store}>
      <ToastProvider>
        <OverlayProvider>
          <Root />
        </OverlayProvider>
      </ToastProvider>
    </StoreProvider>
  );
}

function Root() {
  const store = useStore();
  const phase = useAppState((s) => s.phase);
  const { settings } = useAppData();
  const pwa = usePwaUpdate();
  useAppearance(settings.appearance);
  useVisualViewport();
  const { pathname } = useLocation();

  // A shared-list link opens a static landing page, before onboarding (D3: Safari has its own empty storage).
  const sharedCode = codeFromPath(pathname);
  if (sharedCode) return <SharedLanding code={sharedCode} />;
  if (phase === 'corrupt') return <CorruptScreen />;
  if (phase === 'newer') return <NewerScreen onReload={pwa.updateReady ? pwa.reload : () => window.location.reload()} />;
  if (!settings.onboardingDone) {
    return (
      <Onboarding
        initialCurrency={settings.currency}
        onFinish={(currency) => {
          store.update((d) => ({ ...d, settings: { ...d.settings, currency, onboardingDone: true } }));
          void store.requestPersistence();
        }}
      />
    );
  }
  return <Shell updateReady={pwa.updateReady} onReload={pwa.reload} />;
}
