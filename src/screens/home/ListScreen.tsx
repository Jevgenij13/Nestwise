import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Item } from '../../types.ts';
import { isLive } from '../../lib/entities.ts';
import { filterChores, itemsForList, orderOpenItems, resolveCurrentMemberId } from '../../lib/household.ts';
import { loadPrefs, savePrefs, type ChoreFilter } from '../../app/prefs.ts';
import { useAppData, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button, IconButton } from '../../components/Button.tsx';
import { ChoiceChips, type ChipOption } from '../../components/Chips.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { Group } from '../../components/Group.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Screen } from '../../components/Screen.tsx';
import { ItemRow } from './ItemRow.tsx';
import { QuickAdd } from './QuickAdd.tsx';
import { useItemActions } from './useItemActions.ts';

const FILTERS: ChipOption<ChoreFilter>[] = [
  { value: 'all', label: 'All', testId: 'filter-all' },
  { value: 'mine', label: 'Mine', testId: 'filter-mine' },
];

/** A chores or shopping list (DESIGN 5.5): filter, open items, collapsed Done group, quick add pinned at the bottom. */
export function ListScreen() {
  const { listId = '' } = useParams();
  const navigate = useNavigate();
  const data = useAppData();
  const today = useToday();
  const { open } = useOverlays();
  const actions = useItemActions();
  const list = data.lists.find((l) => l.id === listId && isLive(l));
  const [filter, setFilterState] = useState<ChoreFilter>(() => loadPrefs().choreFilters?.[listId] ?? 'all');
  const [doneOpen, setDoneOpen] = useState(false);

  const currentMemberId = resolveCurrentMemberId(data.members, data.settings.currentMemberId);
  const view = useMemo(() => {
    if (!list) return { open: [] as Item[], done: [] as Item[], totalOpen: 0 };
    const { open: openItems, done } = itemsForList(data.items, list.id);
    const mineOnly = list.type === 'chore' ? filter : 'all';
    return {
      open: filterChores(orderOpenItems(openItems, list.type), mineOnly, currentMemberId),
      done: filterChores(done, mineOnly, currentMemberId),
      totalOpen: openItems.length,
    };
  }, [data.items, list, filter, currentMemberId]);

  if (!list) return <Navigate to="/home" replace />;

  const isChore = list.type === 'chore';
  const members = data.members.filter(isLive);
  const setFilter = (value: ChoreFilter) => {
    setFilterState(value);
    savePrefs({ choreFilters: { ...loadPrefs().choreFilters, [list.id]: value } });
  };
  const row = (item: Item) => <ItemRow key={item.id} item={item} listType={list.type} members={members} today={today} />;

  const nothingOpen = view.open.length === 0;
  const mineEmpty = isChore && filter === 'mine' && nothingOpen && view.done.length === 0 && view.totalOpen > 0;
  const allDone = nothingOpen && view.done.length > 0;

  return (
    <Screen
      title={list.name}
      testId="screen-list"
      back={{ label: 'Home', onPress: () => navigate('/home') }}
      barAction={
        <IconButton aria-label={`${list.name} menu`} onClick={() => open({ kind: 'list-menu', listId: list.id })} data-testid="list-menu-button">
          <Icon name="more" size={24} />
        </IconButton>
      }
      footer={<QuickAdd list={list} />}
    >
      {isChore && <ChoiceChips label="Show" hideLabel options={FILTERS} value={filter} onChange={setFilter} testId="list-filter" />}

      {view.open.length > 0 && (
        <Group testId="list-open">
          {view.open.map(row)}
        </Group>
      )}

      {mineEmpty && (
        <EmptyState
          icon="checklist"
          title="Nothing for you"
          body="Enjoy the quiet."
          testId="list-mine-empty"
          action={<Button variant="text" onClick={() => setFilter('all')} data-testid="list-show-all">Show all</Button>}
        />
      )}
      {allDone && !mineEmpty && <EmptyState icon="check" title="All done" body="Nice." testId="list-all-done" />}
      {nothingOpen && view.done.length === 0 && !mineEmpty && (
        <EmptyState
          icon={isChore ? 'checklist' : 'cart'}
          title={isChore ? 'Nothing to do' : 'Your list is empty'}
          body={isChore ? 'Add the first chore below.' : 'Add what you need below. You can send a copy to your partner from the menu.'}
          testId="list-empty"
        />
      )}

      {view.done.length > 0 && (
        <Group
          title={`Done (${view.done.length})`}
          testId="list-done"
          collapsible={{ open: doneOpen, onToggle: () => setDoneOpen(!doneOpen) }}
        >
          {view.done.map(row)}
        </Group>
      )}
      {!isChore && view.done.length > 0 && (
        <div className="list-actions">
          <Button variant="secondary" onClick={() => actions.clearDone(list)} data-testid="clear-done-button">Clear done</Button>
        </div>
      )}
    </Screen>
  );
}
