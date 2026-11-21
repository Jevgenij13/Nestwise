import { useMemo } from 'react';
import type { Bill } from '../../types.ts';
import { deleteBill, setBillStatus, undeleteBill } from '../../lib/billOps.ts';
import { useStore } from '../../app/StoreProvider.tsx';
import { useToast } from '../../app/toast.tsx';

/** Delete / pause / resume with Undo toasts (AC-BILL-7, 8). Shared by the swipe row, the detail sheet and the edit sheet. */
export function useBillActions() {
  const store = useStore();
  const toast = useToast();
  return useMemo(
    () => ({
      remove(bill: Bill) {
        store.update((d, c) => ({ ...d, bills: deleteBill(d.bills, bill.id, c.now) }));
        toast.show({
          message: `${bill.name} deleted`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => ({ ...d, bills: undeleteBill(d.bills, bill.id, c.now) })),
        });
      },
      pause(bill: Bill) {
        store.update((d, c) => ({ ...d, bills: setBillStatus(d.bills, bill.id, 'paused', c.now) }));
        toast.show({
          message: `${bill.name} paused`,
          actionLabel: 'Undo',
          onAction: () => store.update((d, c) => ({ ...d, bills: setBillStatus(d.bills, bill.id, 'active', c.now) })),
        });
      },
      resume(bill: Bill) {
        store.update((d, c) => ({ ...d, bills: setBillStatus(d.bills, bill.id, 'active', c.now) }));
        toast.show({ message: `${bill.name} resumed` });
      },
    }),
    [store, toast],
  );
}
