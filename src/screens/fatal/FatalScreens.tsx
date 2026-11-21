import { useState } from 'react';
import { emptyData, browserStorage, CORRUPT_KEY } from '../../lib/storage.ts';
import { currencyForLocale } from '../../lib/region.ts';
import { deviceLocales } from '../../app/locale.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { shareOrDownloadFile } from '../../app/files.ts';
import { Button } from '../../components/Button.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ImportPanel } from '../settings/ImportPanel.tsx';

/** Stored data could not be read. Nothing was overwritten; the user chooses (DESIGN 5.1 error state, AC-APP-9). */
export function CorruptScreen() {
  const store = useStore();
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [importing, setImporting] = useState(false);

  const saveCopy = () => {
    const raw = browserStorage()?.getItem(CORRUPT_KEY) ?? '';
    void shareOrDownloadFile('nestwise-damaged-data.txt', raw, 'text/plain');
  };

  return (
    <main className="fatal" data-testid="corrupt-screen">
      <span className="empty__icon empty__icon--danger"><Icon name="warning" size={32} /></span>
      <h1 className="t-title-2">Nestwise can&apos;t read its saved data</h1>
      <p className="t-body">Your data on this phone is damaged. Nothing has been changed or deleted yet. You can restore a backup or start fresh.</p>
      {importing ? (
        <ImportPanel replaceOnly onDone={() => setImporting(false)} />
      ) : (
        <div className="fatal__actions">
          <Button block onClick={() => setImporting(true)} data-testid="corrupt-import-button">Restore a backup</Button>
          <Button variant="secondary" block onClick={saveCopy} data-testid="corrupt-save-copy-button">Save a copy of the damaged data</Button>
          <Button variant="text" className="btn--danger-text" block onClick={() => setConfirmFresh(true)} data-testid="corrupt-fresh-button">Start fresh</Button>
        </div>
      )}
      {confirmFresh && (
        <ConfirmDialog
          title="Start fresh?"
          confirmLabel="Start fresh"
          cancelLabel="Cancel"
          destructive
          onCancel={() => setConfirmFresh(false)}
          onConfirm={() => store.replaceAll(emptyData(currencyForLocale(deviceLocales())))}
          testId="fresh-dialog"
        >
          This replaces the damaged data with an empty Nestwise.
        </ConfirmDialog>
      )}
    </main>
  );
}

/** Data written by a newer app version: shown read-only and never overwritten (phase-1 note). */
export function NewerScreen({ onReload }: { onReload: () => void }) {
  return (
    <main className="fatal" data-testid="newer-screen">
      <span className="empty__icon"><Icon name="info" size={32} /></span>
      <h1 className="t-title-2">Update Nestwise</h1>
      <p className="t-body">Your saved data was made by a newer version of Nestwise. To keep it safe, this version will not open or change it.</p>
      <Button block onClick={onReload} data-testid="newer-reload-button">Check for update</Button>
    </main>
  );
}
