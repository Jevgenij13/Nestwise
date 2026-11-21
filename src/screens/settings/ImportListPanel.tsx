import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyListImport, importSummaryText, previewListImport, type ListImportPreview } from '../../lib/shareOps.ts';
import type { EnvelopeError } from '../../lib/snapshot.ts';
import { importErrorText } from '../../app/errorText.ts';
import { useAppData, useStore } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { TextAreaField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';

/**
 * Import a shared list (AC-HOME-11): choose a .json file or paste a code (or a whole link / message containing one),
 * see "3 new, 2 updated, 1 deleted", then merge. Invalid, damaged or newer-version input shows a message and changes nothing.
 */
export function ImportListPanel() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { household } = useAppData();
  const { closeAll } = useOverlays();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ preview: ListImportPreview } | { error: EnvelopeError } | null>(null);
  const request = useRef(0);

  const evaluate = async (value: string, name: string | null) => {
    setText(value);
    setFileName(name);
    const id = ++request.current;
    if (value.trim() === '') {
      setOutcome(null);
      return;
    }
    const result = await previewListImport(store.getState().data, value, new Date().toISOString());
    if (id === request.current) setOutcome(result.ok ? { preview: result.value } : { error: result.error });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await evaluate(await file.text(), file.name);
    } catch {
      setOutcome({ error: { code: 'not-json', message: 'This file is damaged.' } });
    }
  };

  const merge = (preview: ListImportPreview) => {
    store.update((d, c) => applyListImport(d, preview, c.now));
    toast.show({ message: `Merged: ${importSummaryText(preview.items)}` });
    closeAll();
    navigate(`/home/list/${preview.listId}`);
  };

  if (!household) {
    return (
      <EmptyState
        icon="home"
        title="Set up Home first"
        body="Add your household in the Home tab, then import the shared list."
        testId="import-list-no-household"
        action={<Button onClick={() => { closeAll(); navigate('/home'); }} data-testid="import-list-setup-button">Go to Home</Button>}
      />
    );
  }

  const preview = outcome && 'preview' in outcome ? outcome.preview : null;
  const error = outcome && 'error' in outcome ? outcome.error : null;

  return (
    <div className="form" data-testid="import-list-page">
      <p className="t-callout">Got a shared list from another phone? Choose the file or paste the code. Your lists are merged, never replaced.</p>
      <label className="btn btn--secondary btn--block pressable file-btn">
        Choose file
        <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-list-file-input" />
      </label>
      <TextAreaField label="Or paste the code" value={text} onChange={(v) => void evaluate(v, null)} rows={3} testId="import-list-paste-input" spellCheck={false} autoCapitalize="none" autoCorrect="off" />

      {error && (
        <p className="field__error" role="alert" data-testid="import-list-error">
          <Icon name="warning" size={16} />
          {importErrorText(error)}
        </p>
      )}

      {preview && (
        <>
          <div className="card preview" data-testid="import-list-preview">
            <p className="t-headline" data-testid="import-list-name">{preview.listName}</p>
            {fileName && <p className="t-footnote" data-testid="import-list-filename">{fileName}</p>}
            <p className="t-callout">{preview.listIsNew ? 'A new list on this phone.' : 'Already on this phone. Changes are merged in.'}</p>
            {preview.upToDate ? (
              <p className="t-headline" data-testid="import-list-uptodate">Nothing new. Already up to date.</p>
            ) : (
              <p className="t-headline" data-testid="import-list-counts">{importSummaryText(preview.items)}</p>
            )}
            {preview.newMembers.length > 0 && <p className="t-footnote" data-testid="import-list-members">Adds {preview.newMembers.join(', ')} to your household.</p>}
          </div>
          <p className="t-footnote">Newest change wins for each item.</p>
          <Button block disabled={preview.upToDate} onClick={() => merge(preview)} data-testid="import-list-confirm">Merge into my list</Button>
        </>
      )}
    </div>
  );
}
