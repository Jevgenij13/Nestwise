import { useState, type FormEvent } from 'react';
import type { Member } from '../../types.ts';
import { createHousehold, createMember, MEMBER_COLOURS, MEMBER_NAME_MAX, type NameError } from '../../lib/household.ts';
import { MAX_MEMBERS } from '../../lib/limits.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { Avatar } from '../../components/Avatar.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Screen } from '../../components/Screen.tsx';

export const NAME_ERROR_TEXT: Record<NameError, string> = {
  required: 'Add a name',
  'too-long': `Use ${MEMBER_NAME_MAX} characters or fewer`,
  'limit-reached': `Up to ${MAX_MEMBERS} people`,
  duplicate: 'Someone already has that name',
};

type SetupError = { field: 'household' | number; code: NameError };

/** First use of Home (AC-HOME-1): household name and at least one member (pre-filled "Me"), up to 8, auto colours. */
export function HouseholdSetup() {
  const store = useStore();
  const [householdName, setHouseholdName] = useState('Home');
  const [names, setNames] = useState<string[]>(['Me']);
  const [error, setError] = useState<SetupError | null>(null);

  // Rows left empty are ignored; each keeps its field index so an error lands on the right row.
  const people = names.map((name, index) => ({ index, name: name.trim() })).filter((p) => p.name !== '');
  const canStart = householdName.trim() !== '' && people.length > 0;
  const setName = (i: number, value: string) => setNames((all) => all.map((n, at) => (at === i ? value : n)));

  const start = (e: FormEvent) => {
    e.preventDefault();
    const [first, ...others] = people;
    if (!canStart || !first) return;
    let failure: SetupError | null = null;
    store.update((d, c) => {
      const created = createHousehold({ householdName, memberName: first.name, now: c.now, ids: [c.newId(), c.newId(), c.newId(), c.newId()] });
      if (!created.ok) {
        failure = { field: 'household', code: created.error };
        return d;
      }
      let members: Member[] = [created.value.member];
      for (const person of others) {
        const next = createMember(members, person.name, c.newId(), c.now);
        if (!next.ok) {
          failure = { field: person.index, code: next.error };
          return d;
        }
        members = [...members, next.value];
      }
      return {
        ...d,
        household: created.value.household,
        members: [...d.members, ...members],
        lists: [...d.lists, ...created.value.lists],
        settings: { ...d.settings, currentMemberId: created.value.member.id },
      };
    });
    setError(failure);
  };

  return (
    <Screen title="Set up your household" testId="screen-home">
      <form className="form" onSubmit={start} noValidate data-testid="household-setup">
        <p className="t-callout screen__subtitle">Share chores and shopping with the people you live with.</p>
        <TextField
          label="Household name"
          value={householdName}
          onChange={setHouseholdName}
          error={error?.field === 'household' ? NAME_ERROR_TEXT[error.code] : undefined}
          maxLength={MEMBER_NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          testId="household-name-input"
        />
        <div className="field">
          <span className="field__label">Who lives here?</span>
          <div className="setup__people">
            {names.map((name, i) => (
              <div className="setup__person" key={i}>
                <Avatar member={{ name: name || '?', colour: MEMBER_COLOURS[i] ?? MEMBER_COLOURS[0] }} size={36} />
                <div className="setup__person-field">
                  <TextField
                    label={`Person ${i + 1}`}
                    value={name}
                    onChange={(v) => setName(i, v)}
                    error={error?.field === i ? NAME_ERROR_TEXT[error.code] : undefined}
                    maxLength={MEMBER_NAME_MAX}
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    testId={`member-name-input-${i}`}
                  />
                </div>
              </div>
            ))}
          </div>
          {names.length < MAX_MEMBERS ? (
            <button type="button" className="disclosure tap-target" onClick={() => setNames([...names, ''])} data-testid="add-person-button">
              <Icon name="plus" size={18} />
              Add another person
            </button>
          ) : (
            <p className="t-footnote">Up to {MAX_MEMBERS} people</p>
          )}
        </div>
        <Button type="submit" block disabled={!canStart} data-testid="household-start-button">Start using Home</Button>
      </form>
    </Screen>
  );
}
