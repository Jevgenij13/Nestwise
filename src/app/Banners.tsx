import { useState } from 'react';
import { shouldShowInstallBanner, readInstallContext } from './install.ts';
import { useHasUnsavedInput } from './dirty.ts';
import { loadPrefs, savePrefs } from './prefs.ts';
import { useAppState } from './StoreProvider.tsx';
import { useOverlays } from './overlays.tsx';
import { Banner } from '../components/Banner.tsx';
import { Button } from '../components/Button.tsx';
import { InstallSteps } from '../components/InstallSteps.tsx';

/** Install banner for iOS Safari tabs (AC-APP-2). Dismiss hides it for 7 days; Settings > Help keeps the steps. */
export function InstallBanner() {
  const [dismissedAt, setDismissedAt] = useState(() => loadPrefs().installDismissedAt);
  if (!shouldShowInstallBanner(readInstallContext(), dismissedAt, new Date())) return null;
  return (
    <Banner
      tone="info"
      icon="share"
      testId="install-banner"
      onDismiss={() => {
        const at = new Date().toISOString();
        savePrefs({ installDismissedAt: at });
        setDismissedAt(at);
      }}
    >
      <strong className="t-headline">Install Nestwise</strong>
      <InstallSteps />
    </Banner>
  );
}

/** "Update available, Reload" (AC-APP-11). Waits while a form has unsaved input so nothing is lost. */
export function UpdateBanner({ ready, onReload }: { ready: boolean; onReload: () => void }) {
  const unsaved = useHasUnsavedInput();
  if (!ready) return null;
  return (
    <Banner
      tone="info"
      icon="info"
      testId="update-banner"
      action={<Button variant="secondary" onClick={onReload} disabled={unsaved} data-testid="update-reload-button">Reload</Button>}
    >
      <strong className="t-headline">Update available</strong>
      {unsaved && <p className="t-subhead" data-testid="update-wait-text">Update ready. Finish what you&apos;re doing, then reload.</p>}
    </Banner>
  );
}

/** Storage problems the user must hear about: no storage at all, or a failed write (AC-APP-7). */
export function StorageBanner() {
  const storageAvailable = useAppState((s) => s.storageAvailable);
  const saveFailed = useAppState((s) => s.saveFailed);
  const { open } = useOverlays();
  if (storageAvailable && !saveFailed) return null;
  return (
    <Banner
      tone="danger"
      icon="warning"
      testId="storage-banner"
      action={<Button variant="secondary" onClick={() => open({ kind: 'settings', page: 'backup' })} data-testid="storage-banner-backup">Back up now</Button>}
    >
      <strong className="t-headline">{storageAvailable ? "Couldn't save your last change" : 'Nothing is being saved'}</strong>
      <p className="t-subhead">
        {storageAvailable ? 'Your phone may be out of space. Back up your data now.' : 'This browser is blocking storage, so your data will be lost when you close the app.'}
      </p>
    </Banner>
  );
}
