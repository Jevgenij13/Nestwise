import { useEffect, useState, type FormEvent } from 'react';
import type { ListType } from '../../types.ts';
import { isLive } from '../../lib/entities.ts';
import { createList, LIST_NAME_MAX, renameList, type NameError } from '../../lib/household.ts';
import { MAX_LISTS } from '../../lib/limits.ts';
import { useAppData, useStore } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { ChoiceChips, type ChipOption } from '../../components/Chips.tsx';
import { TextField } from '../../components/Field.tsx';
import { Sheet } from '../../components/Sheet.tsx';

const TYPES: ChipOption<ListType>[] = [
  { value: 'chore', label: 'Chores', testId: 'list-type-chore' },
  { value: 'shopping', label: 'Shopping', testId: 'list-type-shopping' },
];

const LIST_ERROR: Record<NameError, string> = {
  required: 'Add a name',
  'too-long': `Use ${LIST_NAME_MAX} characters or fewer`,
  'limit-reached': `You can keep up to ${MAX_LISTS} lists`,
  duplicate: 'That name is taken',
};

/** New list (name and type, AC-HOME-2) or rename; the type is fixed after creation. */
export function ListFormSheet({ listId }: { listId?: string }) {
  const store = useStore();
  const { lists } = useAppData();
  const { close } = useOverlays();
  const list = listId ? lists.find((l) => l.id === listId && isLive(l)) : undefined;
  const editing = list !== undefined;
  const [name, setName] = useState(list?.name ?? '');
  const [type, setType] = useState<ListType>(list?.type ?? 'chore');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listId && !list) close();
  }, [listId, list, close]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    let failure: NameError | null = null;
    store.update((d, c) => {
      if (list) {
        const result = renameList(d.lists, list.id, name, c.now);
        if (!result.ok) {
          failure = result.error;
          return d;
        }
        return { ...d, lists: result.value };
      }
      const created = createList(d.lists, name, type, c.newId(), c.now);
      if (!created.ok) {
        failure = created.error;
        return d;
      }
      return { ...d, lists: [...d.lists, created.value] };
    });
    if (failure) setError(LIST_ERROR[failure]);
    else close();
  };

  return (
    <Sheet
      title={editing ? 'Rename list' : 'New list'}
      detent="medium"
      dirty={name !== (list?.name ?? '')}
      onClose={close}
      testId="list-sheet"
      footer={<Button type="submit" form="list-form" block disabled={name.trim() === ''} data-testid="list-save-button">{editing ? 'Save' : 'Create list'}</Button>}
    >
      <form id="list-form" className="form" onSubmit={save} noValidate>
        <TextField label="Name" value={name} onChange={(v) => { setName(v); setError(null); }} error={error ?? undefined} maxLength={LIST_NAME_MAX} autoFocus={!editing} autoComplete="off" autoCapitalize="words" enterKeyHint="done" testId="list-name-input" />
        {editing ? (
          <p className="t-footnote" data-testid="list-type-fixed">{list.type === 'chore' ? 'Chores' : 'Shopping'} list. The type cannot be changed.</p>
        ) : (
          <ChoiceChips label="Type" options={TYPES} value={type} onChange={setType} testId="list-type" />
        )}
      </form>
    </Sheet>
  );
}
