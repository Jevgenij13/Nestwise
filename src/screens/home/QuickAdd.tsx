import { useRef, useState, type FormEvent } from 'react';
import type { List } from '../../types.ts';
import { createItem } from '../../lib/household.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { Icon } from '../../components/Icon.tsx';

export const ITEM_TITLE_MAX = 100;

/**
 * Quick add (AC-HOME-3): one field pinned above the keyboard. Return adds, clears and keeps focus so several
 * items go in quickly; empty or whitespace-only text is ignored.
 */
export function QuickAdd({ list }: { list: List }) {
  const store = useStore();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = list.type === 'chore' ? 'Add a chore...' : 'Add an item...';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = text.trim();
    setText('');
    inputRef.current?.focus();
    if (title === '') return;
    store.update((d, c) => {
      const item = createItem({ listId: list.id, title, id: c.newId(), now: c.now });
      return item ? { ...d, items: [...d.items, item] } : d;
    });
  };

  return (
    <form className="quickadd" onSubmit={submit}>
      <div className="input quickadd__field">
        <input
          ref={inputRef}
          className="input__control"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder.replace('...', '')}
          maxLength={ITEM_TITLE_MAX}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          data-testid="quick-add-input"
        />
      </div>
      <button type="submit" className="quickadd__btn tap-target pressable" aria-label="Add" data-testid="quick-add-button">
        <Icon name="plus" size={22} />
      </button>
    </form>
  );
}
