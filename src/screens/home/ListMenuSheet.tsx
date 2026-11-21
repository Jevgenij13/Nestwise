import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLive } from '../../lib/entities.ts';
import { useAppData } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Icon, type IconName } from '../../components/Icon.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { useItemActions } from './useItemActions.ts';
import { useListActions } from './useListActions.ts';

/** The list's "..." menu (DESIGN 5.5): Rename, Share list, Clear done (shopping), Delete list. */
export function ListMenuSheet({ listId }: { listId: string }) {
  const { lists, items } = useAppData();
  const { close, replace } = useOverlays();
  const navigate = useNavigate();
  const itemActions = useItemActions();
  const listActions = useListActions();
  const list = lists.find((l) => l.id === listId && isLive(l));

  useEffect(() => {
    if (!list) close();
  }, [list, close]);
  if (!list) return null;

  const doneCount = items.filter((i) => i.listId === list.id && isLive(i) && i.done).length;
  const entry = (icon: IconName, label: string, testId: string, onPress: () => void, extra = '', disabled = false) => (
    <li className="srow">
      <button type="button" className={`srow__btn pressable ${extra}`.trim()} onClick={onPress} disabled={disabled} data-testid={testId}>
        <Icon name={icon} size={22} />
        <span className="srow__label t-body">{label}</span>
      </button>
    </li>
  );

  return (
    <Sheet title={list.name} closeLabel="Close" detent="medium" onClose={close} testId="list-menu">
      <ul className="card list">
        {entry('pencil', 'Rename list', 'list-menu-rename', () => replace({ kind: 'list-form', listId: list.id }))}
        {entry('share', 'Share list', 'list-menu-share', () => replace({ kind: 'share-list', listId: list.id }))}
        {list.type === 'shopping' && entry('check', `Clear done${doneCount > 0 ? ` (${doneCount})` : ''}`, 'list-menu-clear-done', () => { itemActions.clearDone(list); close(); }, '', doneCount === 0)}
        {entry('trash', 'Delete list', 'list-menu-delete', () => { close(); listActions.remove(list); navigate('/home'); }, 'srow__btn--danger')}
      </ul>
    </Sheet>
  );
}
