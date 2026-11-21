import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Member } from '../../types.ts';
import { createMember, liveMembers, removeMemberFromData, renameMember, resolveCurrentMemberId } from '../../lib/household.ts';
import { MAX_MEMBERS } from '../../lib/limits.ts';
import { useAppData, useStore } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Avatar } from '../../components/Avatar.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { TextField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { NAME_ERROR_TEXT } from './HouseholdSetup.tsx';

/**
 * "Who is using?" (AC-HOME-7) and member management (AC-HOME-1, 8): one sheet with two pages.
 * Opened from the Home tab, the Today chip and Settings > Household members.
 */
export function MembersSheet({ initialPage = 'switch' }: { initialPage?: 'switch' | 'manage' }) {
  const { household, members, settings } = useAppData();
  const { close, closeAll } = useOverlays();
  const navigate = useNavigate();
  const [page, setPage] = useState(initialPage);
  const live = liveMembers(members);
  const manage = page === 'manage';

  if (!household) {
    return (
      <Sheet title="Household members" closeLabel="Close" onClose={close} detent="medium" testId="members-sheet">
        <EmptyState
          icon="person"
          title="Set up Home first"
          body="Add your household and the people in it to share chores and shopping."
          testId="members-no-household"
          action={<Button onClick={() => { closeAll(); navigate('/home'); }} data-testid="members-setup-button">Set up Home</Button>}
        />
      </Sheet>
    );
  }

  const current = resolveCurrentMemberId(members, settings.currentMemberId);
  return (
    <Sheet
      title={manage ? 'Members' : 'Who is using?'}
      closeLabel={manage && initialPage === 'switch' ? 'Back' : 'Close'}
      onClose={manage && initialPage === 'switch' ? () => setPage('switch') : close}
      detent={manage ? 'large' : 'medium'}
      testId="members-sheet"
    >
      {manage ? <ManagePage members={live} /> : <SwitchPage members={live} currentId={current} onManage={() => setPage('manage')} />}
    </Sheet>
  );
}

function SwitchPage({ members, currentId, onManage }: { members: Member[]; currentId: string | null; onManage: () => void }) {
  const store = useStore();
  const { close } = useOverlays();
  const choose = (id: string) => {
    store.update((d) => (d.settings.currentMemberId === id ? d : { ...d, settings: { ...d.settings, currentMemberId: id } }));
    close();
  };
  return (
    <div className="form">
      <ul className="card list" role="radiogroup" aria-label="Who is using?" data-testid="member-options">
        {members.map((m) => (
          <li key={m.id} className="srow">
            <button type="button" role="radio" aria-checked={m.id === currentId} className="srow__btn pressable" onClick={() => choose(m.id)} data-testid={`member-option-${m.id}`}>
              <Avatar member={m} size={36} />
              <span className={`srow__label t-body${m.id === currentId ? ' srow__label--on' : ''}`}>{m.name}</span>
              {m.id === currentId && <Icon name="check" size={22} />}
            </button>
          </li>
        ))}
      </ul>
      <ul className="card list">
        <li className="srow">
          <button type="button" className="srow__btn pressable" onClick={onManage} data-testid="manage-members-button">
            <span className="srow__label t-body">Manage members</span>
            <Icon name="chevron-right" size={18} />
          </button>
        </li>
      </ul>
    </div>
  );
}

function ManagePage({ members }: { members: Member[] }) {
  const store = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const atLimit = members.length >= MAX_MEMBERS;
  const onlyOne = members.length <= 1;

  const startEdit = (m: Member) => {
    setEditing(m.id);
    setDraft(m.name);
    setError(null);
  };
  const saveEdit = (e: FormEvent, m: Member) => {
    e.preventDefault();
    let failure: string | null = null;
    store.update((d, c) => {
      const result = renameMember(d.members, m.id, draft, c.now);
      if (!result.ok) {
        failure = NAME_ERROR_TEXT[result.error];
        return d;
      }
      return { ...d, members: result.value };
    });
    setError(failure ? { id: m.id, text: failure } : null);
    if (!failure) setEditing(null);
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    let failure: string | null = null;
    store.update((d, c) => {
      const result = createMember(d.members, adding, c.newId(), c.now);
      if (!result.ok) {
        failure = NAME_ERROR_TEXT[result.error];
        return d;
      }
      return { ...d, members: [...d.members, result.value] };
    });
    setAddError(failure);
    if (!failure) setAdding('');
  };

  return (
    <div className="form" data-testid="members-manage">
      <ul className="card list">
        {members.map((m) => (
          <li key={m.id} className="mrow" data-testid={`member-row-${m.id}`}>
            <Avatar member={m} size={36} />
            {editing === m.id ? (
              <form className="mrow__edit" onSubmit={(e) => saveEdit(e, m)} noValidate>
                <TextField label="Name" value={draft} onChange={setDraft} error={error?.id === m.id ? error.text : undefined} maxLength={30} autoFocus autoComplete="off" autoCapitalize="words" testId={`member-rename-input-${m.id}`} />
                <div className="mrow__buttons">
                  <Button type="submit" data-testid={`member-rename-save-${m.id}`}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(null)} data-testid={`member-rename-cancel-${m.id}`}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <button type="button" className="mrow__name t-body pressable" onClick={() => startEdit(m)} aria-label={`Rename ${m.name}`} data-testid={`member-edit-${m.id}`}>
                  {m.name}
                </button>
                {!onlyOne && (
                  <IconButton aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)} data-testid={`member-remove-${m.id}`}>
                    <Icon name="trash" size={22} />
                  </IconButton>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {onlyOne && <p className="t-footnote" data-testid="members-min-hint">You need at least one person</p>}

      <form className="mrow__add" onSubmit={add} noValidate>
        <TextField
          label="Add a person"
          value={adding}
          onChange={setAdding}
          error={addError ?? undefined}
          hint={atLimit ? `Up to ${MAX_MEMBERS} people` : undefined}
          disabled={atLimit}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          testId="member-add-input"
        />
        <Button type="submit" variant="secondary" block disabled={atLimit || adding.trim() === ''} data-testid="member-add-button">
          <Icon name="plus" size={20} />
          Add person
        </Button>
      </form>
      <p className="t-footnote" data-testid="member-count">{members.length} of {MAX_MEMBERS}</p>

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          destructive
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const id = removing.id;
            store.update((d, c) => removeMemberFromData(d, id, c.now));
            setRemoving(null);
          }}
          testId="remove-member-dialog"
        >
          {`${removing.name}'s open tasks will go to Anyone. Items ${removing.name} already completed keep their name.`}
        </ConfirmDialog>
      )}
    </div>
  );
}
