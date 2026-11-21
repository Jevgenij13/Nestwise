import { useMemo } from 'react';
import type { Item, List } from '../../types.ts';
import { softDelete, restore } from '../../lib/entities.ts';
import { clearDone, restoreListItems } from '../../lib/household.ts';
import { formatShortDate } from '../../lib/format.ts';
import { checkItem, undoItemDone } from '../../lib/itemOps.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { useToast } from '../../app/toast.tsx';

/** Check off, reopen, delete and clear done items with Undo toasts (AC-HOME-4, 5, 12). Shared by lists, Today and the item sheet. */
export function useItemActions() {
  const store = useStore();
  const toast = useToast();
  return useMemo(
    () => ({
      /** Checks an item off, stamped with the current member (AC-HOME-4). A repeating chore also gets its next occurrence (AC-HOME-13). */
      complete(item: Item) {
        const previous = store.getState().data.items.find((i) => i.id === item.id);
        if (!previous || previous.done || previous.deletedAt !== null) return;
        let createdId: string | undefined;
        let nextDue: string | undefined;
        store.update((d, c) => {
          const result = checkItem(d, previous.id, true, c.today, c.now, c.newId());
          createdId = result.createdId;
          nextDue = result.data.items.find((i) => i.id === createdId)?.dueDate;
          return result.data;
        });
        toast.show({
          message: nextDue ? `Done. Next one: ${formatShortDate(nextDue, deviceLocale())}` : `${previous.title} done`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => undoItemDone(d, previous, createdId, c.now)),
        });
      },
      /** Un-checking restores the item to the open list. */
      reopen(item: Item) {
        store.update((d, c) => checkItem(d, item.id, false, c.today, c.now, c.newId()).data);
      },
      remove(item: Item) {
        store.update((d, c) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? softDelete(i, c.now) : i)) }));
        toast.show({
          message: `${item.title} deleted`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? restore(i, c.now) : i)) })),
        });
      },
      /** "Clear done" (AC-HOME-5): deletes every done item of a list with a 5-second Undo. */
      clearDone(list: List) {
        let ids: string[] = [];
        store.update((d, c) => {
          const result = clearDone(d.items, list.id, c.now);
          ids = result.ids;
          return result.cleared === 0 ? d : { ...d, items: result.items };
        });
        if (ids.length === 0) return;
        toast.show({
          message: `${ids.length} ${ids.length === 1 ? 'item' : 'items'} cleared`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => ({ ...d, ...restoreListItems(d.lists, d.items, null, ids, c.now) })),
        });
      },
    }),
    [store, toast],
  );
}
