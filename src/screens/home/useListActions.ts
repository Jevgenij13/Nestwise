import { useMemo } from 'react';
import type { List } from '../../types.ts';
import { deleteList, restoreListItems } from '../../lib/household.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { useToast } from '../../app/toast.tsx';

/** Delete a list (and its items) with a 5-second Undo (DESIGN 5.5). */
export function useListActions() {
  const store = useStore();
  const toast = useToast();
  return useMemo(
    () => ({
      remove(list: List) {
        let itemIds: string[] = [];
        store.update((d, c) => {
          const result = deleteList(d.lists, d.items, list.id, c.now);
          itemIds = result.itemIds;
          return { ...d, lists: result.lists, items: result.items };
        });
        toast.show({
          message: `${list.name} deleted`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => ({ ...d, ...restoreListItems(d.lists, d.items, list.id, itemIds, c.now) })),
        });
      },
    }),
    [store, toast],
  );
}
