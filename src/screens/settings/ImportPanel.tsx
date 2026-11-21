import { useState } from 'react';
import { previewBackup, restoreBackup, type BackupPreview, type RestoreMode } from '../../lib/backup.ts';
import type { EnvelopeError } from '../../lib/snapshot.ts';
import { importErrorText } from '../../app/errorText.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';
import { TextAreaField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';

interface ImportPanelProps {
  /** Corrupt-data recovery has nothing to merge with, so only Replace is offered. */
  replaceOnly?: boolean;
  onDone: () => void;
}

/** Import a backup (AC-APP-9): choose a file or paste text, see counts, then Replace all or Merge. Invalid files change nothing. */
export function ImportPanel({ replaceOnly = false, onDone }: ImportPanelProps) {
  const store = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<RestoreMode>(replaceOnly ? 'replace' : 'merge');
  const [outcome, setOutcome] = useState<{ preview: BackupPreview } | { error: EnvelopeError } | null>(null);

  const evaluate = (value: string, name: string | null) => {
    setText(value);
    setFileName(name);
    if (value.trim() === '') {
      setOutcome(null);
      return;
    }
    const result = previewBackup(value);
    setOutcome(result.ok ? { preview: result.value } : { error: result.error });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      evaluate(await file.text(), file.name);
    } catch {
      setOutcome({ error: { code: 'not-json', message: 'This file is damaged.' } });
    }
  };

  const doImport = (preview: BackupPreview) => {
    if (mode === 'replace') {
      store.replaceAll(preview.incoming);
      toast.show({ message: 'Backup restored' });
    } else {
      let summary: { added: number; updated: number; deleted: number } | undefined;
      store.update((d, c) => {
        const result = restoreBackup(d, preview.incoming, 'merge', c.now);
        summary = result.summary;
        return result.data;
      });
      toast.show({ message: summary ? `Merged: ${summary.added} new, ${summary.updated} updated, ${summary.deleted} deleted` : 'Backup merged' });
    }
    onDone();
  };

  const preview = outcome && 'preview' in outcome ? outcome.preview : null;
  const error = outcome && 'error' in outcome ? outcome.error : null;
  const c = preview?.counts;

  return (
    <div className="form" data-testid="import-page">
      <label className="btn btn--secondary btn--block pressable file-btn">
        Choose file
        <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-file-input" />
      </label>
      <TextAreaField label="Or paste the backup text" value={text} onChange={(v) => evaluate(v, null)} rows={3} testId="import-paste-input" spellCheck={false} autoCapitalize="none" />

      {error && (
        <p className="field__error" role="alert" data-testid="import-error">
          <Icon name="warning" size={16} />
          {importErrorText(error)}
        </p>
      )}

      {preview && c && (
        <>
          <div className="card preview" data-testid="import-preview">
            {fileName && <p className="t-headline" data-testid="import-filename">{fileName}</p>}
            <p className="t-callout" data-testid="import-counts">
              {c.bills} bills · {c.members} members · {c.lists} lists · {c.items} items · {c.goals} goals
            </p>
            <p className="t-footnote">Backed up {new Date(preview.exportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>

          {!replaceOnly && (
            <div className="radios" role="radiogroup" aria-label="How to import">
              <label className="radio">
                <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} data-testid="import-mode-replace" />
                <span>Replace all data on this phone</span>
              </label>
              <label className="radio">
                <input type="radio" name="import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} data-testid="import-mode-merge" />
                <span>Merge with what is here</span>
              </label>
            </div>
          )}
          {mode === 'replace' && <p className="t-footnote" data-testid="import-replace-warning">This replaces everything on this phone. Make a backup first if unsure.</p>}
          {mode === 'merge' && <p className="t-footnote">Newest change wins for each item.</p>}
          <Button block onClick={() => doImport(preview)} data-testid="import-confirm-button">{mode === 'replace' ? 'Replace all data' : 'Merge'}</Button>
        </>
      )}
    </div>
  );
}
