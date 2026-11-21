import { useState } from 'react';
import { useStore } from '../../app/StoreProvider.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/Field.tsx';

export const ERASE_WORD = 'ERASE';

/** Erase all data (AC-APP-4): the button stays disabled until the user types ERASE exactly. Afterwards the app returns to first run. */
export function ErasePage({ onBackup, onDone }: { onBackup: () => void; onDone: () => void }) {
  const store = useStore();
  const [typed, setTyped] = useState('');
  const confirmed = typed === ERASE_WORD;

  return (
    <div className="form" data-testid="erase-page">
      <p className="t-callout">This deletes every bill, list and goal on this phone. It can&apos;t be undone. Back up first.</p>
      <Button variant="secondary" block onClick={onBackup} data-testid="erase-backup-button">Back up first</Button>
      <TextField label="Type ERASE to confirm" value={typed} onChange={setTyped} testId="erase-input" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} />
      <Button
        variant="destructive"
        block
        disabled={!confirmed}
        onClick={() => {
          store.erase();
          onDone();
        }}
        data-testid="erase-confirm-button"
      >
        Erase everything
      </Button>
    </div>
  );
}
