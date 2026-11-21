import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Repeat } from '../../types.ts';
import { addDays, isValidDate } from '../../lib/dates.ts';
import { isLive } from '../../lib/entities.ts';
import { formatDateWithYear } from '../../lib/format.ts';
import { editItem } from '../../lib/household.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useAppData, useStore, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Avatar } from '../../components/Avatar.tsx';
import { Button } from '../../components/Button.tsx';
import { ChoiceChips, type ChipOption } from '../../components/Chips.tsx';
import { TextField } from '../../components/Field.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { REPEAT_LABEL } from './ItemRow.tsx';
import { ITEM_TITLE_MAX } from './QuickAdd.tsx';
import { useItemActions } from './useItemActions.ts';

type DueMode = 'none' | 'today' | 'tomorrow' | 'pick';

const DUE_OPTIONS: ChipOption<DueMode>[] = [
  { value: 'none', label: 'No date', testId: 'item-due-none' },
  { value: 'today', label: 'Today', testId: 'item-due-today' },
  { value: 'tomorrow', label: 'Tomorrow', testId: 'item-due-tomorrow' },
  { value: 'pick', label: 'Pick a date', testId: 'item-due-pick' },
];
const REPEATS: readonly Repeat[] = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
const REPEAT_OPTIONS: ChipOption<Repeat>[] = REPEATS.map((r) => ({ value: r, label: r === 'none' ? 'None' : REPEAT_LABEL[r], testId: `item-repeat-${r}` }));

const ANYONE = 'anyone';

interface FormState {
  title: string;
  qty: string;
  assignee: string;
  dueMode: DueMode;
  pickDate: string;
  repeat: Repeat;
}

/**
 * Item edit sheet (DESIGN 5.5, AC-HOME-6): title; chores also get Assigned to (Anyone or a member), Due date and Repeat;
 * shopping items get Quantity. Changes are applied with Done; Cancel asks before discarding. Delete has the usual Undo.
 */
export function ItemSheet({ itemId }: { itemId: string }) {
  const store = useStore();
  const { items, lists, members } = useAppData();
  const today = useToday();
  const { close } = useOverlays();
  const actions = useItemActions();
  const item = items.find((i) => i.id === itemId && isLive(i));
  const list = item ? lists.find((l) => l.id === item.listId) : undefined;
  const isChore = list?.type === 'chore';
  const liveMembers = members.filter(isLive);

  const initial = useMemo<FormState>(() => {
    const due = item?.dueDate;
    const dueMode: DueMode = !due ? 'none' : due === today ? 'today' : due === addDays(today, 1) ? 'tomorrow' : 'pick';
    const assignee = item?.assigneeId && liveMembers.some((m) => m.id === item.assigneeId) ? item.assigneeId : ANYONE;
    return { title: item?.title ?? '', qty: item?.qty ?? '', assignee, dueMode, pickDate: dueMode === 'pick' && due ? due : '', repeat: item?.repeat ?? 'none' };
    // Seeded once when the sheet opens; later store changes must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [form, setForm] = useState<FormState>(initial);
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  // The item can disappear while the sheet is open (an Undo elsewhere, a merge); close rather than edit a ghost.
  useEffect(() => {
    if (!item) close();
  }, [item, close]);
  if (!item || !list) return null;

  const dueDate = form.dueMode === 'today' ? today : form.dueMode === 'tomorrow' ? addDays(today, 1) : form.dueMode === 'pick' ? form.pickDate : undefined;
  const dateOk = form.dueMode !== 'pick' || isValidDate(form.pickDate);
  const titleOk = form.title.trim() !== '';
  const canSave = titleOk && dateOk;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const hint = !titleOk ? 'Add a title to save' : !dateOk ? 'Pick a date to save' : '';

  const assigneeOptions: ChipOption<string>[] = [
    { value: ANYONE, label: 'Anyone', testId: 'item-assign-anyone', leading: <Avatar member={null} size={22} /> },
    ...liveMembers.map((m) => ({ value: m.id, label: m.name, testId: `item-assign-${m.id}`, leading: <Avatar member={m} size={22} /> })),
  ];

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    store.update((d, c) => ({
      ...d,
      items: d.items.map((i) => {
        if (i.id !== item.id) return i;
        return (
          editItem(i, { title: form.title, qty: isChore ? undefined : form.qty, assigneeId: isChore && form.assignee !== ANYONE ? form.assignee : undefined, dueDate: isChore ? dueDate : undefined, repeat: isChore ? form.repeat : undefined }, c.now) ?? i
        );
      }),
    }));
    close();
  };

  return (
    <Sheet
      title={isChore ? 'Chore' : 'Item'}
      detent="medium"
      dirty={dirty}
      onClose={close}
      testId="item-sheet"
      footer={
        <>
          {hint && <p className="sheet__hint t-footnote" data-testid="item-save-hint">{hint}</p>}
          <Button type="submit" form="item-form" block disabled={!canSave} data-testid="item-save-button">Done</Button>
        </>
      }
    >
      <form id="item-form" className="form" onSubmit={save} noValidate>
        <TextField label="Title" value={form.title} onChange={(title) => patch({ title })} maxLength={ITEM_TITLE_MAX} autoComplete="off" autoCapitalize="sentences" enterKeyHint="done" testId="item-title-input" />
        {isChore ? (
          <>
            <ChoiceChips
              label="Assigned to"
              options={assigneeOptions}
              value={form.assignee}
              onChange={(assignee) => patch({ assignee })}
              testId="item-assign"
            />
            <ChoiceChips label="Due date" options={DUE_OPTIONS} value={form.dueMode} onChange={(dueMode) => patch({ dueMode, pickDate: dueMode === 'pick' && !form.pickDate ? today : form.pickDate })} testId="item-due" />
            {form.dueMode === 'pick' && (
              <TextField label="Date" type="date" value={form.pickDate} onChange={(pickDate) => patch({ pickDate })} error={dateOk ? undefined : 'Pick a date'} testId="item-due-input" />
            )}
            <ChoiceChips label="Repeat" options={REPEAT_OPTIONS} value={form.repeat} onChange={(repeat) => patch({ repeat })} testId="item-repeat" />
          </>
        ) : (
          <TextField label="Quantity (optional)" value={form.qty} onChange={(qty) => patch({ qty })} maxLength={30} placeholder="2 x, 500 g" autoComplete="off" enterKeyHint="done" testId="item-qty-input" />
        )}
        {item.done && (
          <p className="t-footnote" data-testid="item-done-stamp">
            Done{item.doneBy ? ` by ${item.doneBy.name}` : ''}{item.doneAt ? ` on ${formatDateWithYear(item.doneAt, deviceLocale())}` : ''}
          </p>
        )}
        <div className="form__danger">
          <Button variant="text" className="btn--danger-text" block onClick={() => { actions.remove(item); close(); }} data-testid="item-delete-button">
            Delete {isChore ? 'chore' : 'item'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
