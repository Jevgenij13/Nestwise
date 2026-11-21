import type { Item, ListType, Member } from '../../types.ts';
import { choreDueText, choreUrgency } from '../../lib/household.ts';
import { formatShortDate } from '../../lib/format.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useOverlays } from '../../app/overlays.tsx';
import { Avatar } from '../../components/Avatar.tsx';
import { StatusPill } from '../../components/Chips.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ListRow, type SwipeAction } from '../../components/ListRow.tsx';
import { useItemActions } from './useItemActions.ts';

export const REPEAT_LABEL = { none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' } as const;

interface ItemRowProps {
  item: Item;
  listType: ListType;
  members: Member[];
  today: string;
}

/** The status line of a chore: overdue (red, warning icon, words), due soon (amber, clock) or a plain date (AC-HOME-9). */
export function ChoreDue({ item, today }: { item: Item; today: string }) {
  const locale = deviceLocale();
  const text = choreDueText(item, today);
  if (!text || !item.dueDate) return null;
  const urgency = choreUrgency(item, today);
  if (urgency === 'overdue') return <StatusPill tone="overdue" icon="warning">{text}</StatusPill>;
  const date = formatShortDate(item.dueDate, locale);
  if (urgency === 'soon') return <StatusPill tone="due-soon" icon="clock">{`${text} · ${date}`}</StatusPill>;
  return <span>{date}</span>;
}

/** One chore or shopping row: checkbox, title, due / assignee / quantity. Tap opens the item sheet; swipe left gives Edit and Delete. */
export function ItemRow({ item, listType, members, today }: ItemRowProps) {
  const { open } = useOverlays();
  const actions = useItemActions();
  const isChore = listType === 'chore';
  const assignee = item.assigneeId ? members.find((m) => m.id === item.assigneeId && m.deletedAt === null) ?? null : null;
  const locale = deviceLocale();

  const doneStamp = item.done ? [item.doneBy?.name, item.doneAt ? formatShortDate(item.doneAt, locale) : null].filter(Boolean).join(' · ') : '';
  const subtitle = item.done ? (
    doneStamp || undefined
  ) : isChore && (item.dueDate || item.repeat) ? (
    <>
      <ChoreDue item={item} today={today} />
      {item.repeat && (
        <span className="row__repeat">
          <Icon name="repeat" size={14} />
          {REPEAT_LABEL[item.repeat]}
        </span>
      )}
    </>
  ) : undefined;

  const swipe: SwipeAction[] = [
    ...(isChore ? [{ key: 'edit', label: 'Edit', icon: 'pencil', tone: 'edit', onAction: () => open({ kind: 'item', itemId: item.id }), testId: `item-edit-${item.id}` } as const] : []),
    { key: 'delete', label: 'Delete', icon: 'trash', tone: 'delete', onAction: () => actions.remove(item), testId: `item-delete-${item.id}` },
  ];

  const spoken = [
    item.title,
    item.done ? 'done' : null,
    item.qty ?? null,
    isChore ? `assigned to ${assignee?.name ?? 'Anyone'}` : null,
    !item.done && isChore && item.dueDate ? choreDueText(item, today) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ListRow
      id={`item-${item.id}`}
      testId={`item-${item.id}`}
      onPress={() => open({ kind: 'item', itemId: item.id })}
      ariaLabel={spoken}
      leading={
        <button
          type="button"
          className={`check tap-target${item.done ? ' check--done' : ''}`}
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
          onClick={() => (item.done ? actions.reopen(item) : actions.complete(item))}
          data-testid={`item-check-${item.id}`}
        >
          <span className="check__box">{item.done && <Icon name="check" size={18} />}</span>
        </button>
      }
      title={item.title}
      subtitle={subtitle}
      trailing={
        isChore ? (
          <span data-testid={`item-assignee-${item.id}`} data-assignee={assignee?.id ?? 'anyone'}><Avatar member={assignee} /></span>
        ) : item.qty ? (
          <span className="row__qty t-callout" data-testid={`item-qty-${item.id}`}>{item.qty}</span>
        ) : undefined
      }
      muted={item.done}
      struck={item.done}
      actions={swipe}
    />
  );
}
