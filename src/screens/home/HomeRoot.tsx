import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { List } from '../../types.ts';
import { isLive } from '../../lib/entities.ts';
import { listSummary, resolveCurrentMemberId } from '../../lib/household.ts';
import { MAX_LISTS } from '../../lib/limits.ts';
import { useAppData, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { StatusPill } from '../../components/Chips.tsx';
import { Group } from '../../components/Group.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ListRow, type SwipeAction } from '../../components/ListRow.tsx';
import { Screen } from '../../components/Screen.tsx';
import { MemberChip } from './MemberChip.tsx';
import { useListActions } from './useListActions.ts';

/** Home root (DESIGN 5.5): who is using, the lists with their counts, and a way to add or import a list. */
export function HomeRoot() {
  const data = useAppData();
  const today = useToday();
  const navigate = useNavigate();
  const { open } = useOverlays();
  const actions = useListActions();
  const memberId = resolveCurrentMemberId(data.members, data.settings.currentMemberId);

  const lists = useMemo(() => data.lists.filter(isLive).sort((a, b) => a.sortOrder - b.sortOrder), [data.lists]);
  const atLimit = lists.length >= MAX_LISTS;

  const row = (list: List) => {
    const s = listSummary(data.items, list, memberId, today);
    const soonOnly = s.dueSoon - s.overdue;
    const swipe: SwipeAction[] = [
      { key: 'rename', label: 'Rename', icon: 'pencil', tone: 'edit', onAction: () => open({ kind: 'list-form', listId: list.id }), testId: `list-rename-${list.id}` },
      { key: 'delete', label: 'Delete', icon: 'trash', tone: 'delete', onAction: () => actions.remove(list), testId: `list-delete-${list.id}` },
    ];
    return (
      <ListRow
        key={list.id}
        id={`list-${list.id}`}
        testId={`list-row-${list.id}`}
        onPress={() => navigate(`/home/list/${list.id}`)}
        ariaLabel={`${list.name}, ${list.type === 'chore' ? 'chores' : 'shopping'}, ${s.open} open${s.dueSoon > 0 ? `, ${s.dueSoon} due soon` : ''}`}
        leading={<span className="row__icon"><Icon name={list.type === 'chore' ? 'checklist' : 'cart'} size={22} /></span>}
        title={list.name}
        subtitle={
          <>
            <span data-testid={`list-count-${list.id}`}>{list.type === 'chore' ? `${s.open} open` : `${s.open} ${s.open === 1 ? 'item' : 'items'}`}</span>
            {s.overdue > 0 && <StatusPill tone="overdue" icon="warning" testId={`list-overdue-${list.id}`}>{s.overdue} overdue</StatusPill>}
            {soonOnly > 0 && <StatusPill tone="due-soon" icon="clock" testId={`list-due-soon-${list.id}`}>{soonOnly} due soon</StatusPill>}
          </>
        }
        trailing={<Icon name="chevron-right" size={18} />}
        actions={swipe}
      />
    );
  };

  return (
    <Screen title="Home" subtitle={data.household?.name} testId="screen-home">
      <section className="group" data-testid="home-who">
        <h2 className="t-section group__title">Who is using?</h2>
        <div className="card">
          <MemberChip variant="row" />
        </div>
      </section>

      <Group title="Lists" testId="home-lists">{lists.map(row)}</Group>

      <div className="list-actions">
        <Button variant="secondary" disabled={atLimit} onClick={() => open({ kind: 'list-form' })} data-testid="list-add-button">
          <Icon name="plus" size={20} />
          {atLimit ? `List limit reached (${MAX_LISTS})` : 'New list'}
        </Button>
        <Button variant="text" onClick={() => open({ kind: 'settings', page: 'import-list' })} data-testid="home-import-button">Import a shared list</Button>
      </div>
    </Screen>
  );
}
