import { useState } from 'react';
import { backupFilename, createBackup } from '../../lib/backup.ts';
import { useAppData, useStore } from '../../app/StoreProvider.tsx';
import { shareOrDownloadFile } from '../../app/files.ts';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';

/** Back up (AC-APP-8): one dated JSON file through the share sheet, with a download fallback. */
export function BackupPage() {
  const store = useStore();
  const data = useAppData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const { today } = store.getState();
    const now = new Date().toISOString();
    const outcome = await shareOrDownloadFile(backupFilename(today), createBackup(data, now));
    setBusy(false);
    // A dismissed share sheet saved nothing, so it is not recorded as a backup.
    if (outcome === 'cancelled') return;
    store.update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: now } }));
    toast.show({ message: 'Backup saved' });
  };

  return (
    <div className="form" data-testid="backup-page">
      <p className="t-callout">Saves everything (bills, lists, goals, settings) in one file. Keep it somewhere safe like iCloud Drive.</p>
      <Button block disabled={busy} onClick={() => void create()} data-testid="backup-create-button">Create backup file</Button>
      <p className="t-footnote">The file is called {backupFilename(store.getState().today)}.</p>
    </div>
  );
}
