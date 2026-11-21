import type { ReactNode } from 'react';
import { BillDetailSheet } from '../screens/bills/BillDetailSheet.tsx';
import { BillFormSheet } from '../screens/bills/BillFormSheet.tsx';
import { GoalSheet } from '../screens/goals/GoalSheet.tsx';
import { ItemSheet } from '../screens/home/ItemSheet.tsx';
import { ListFormSheet } from '../screens/home/ListFormSheet.tsx';
import { ListMenuSheet } from '../screens/home/ListMenuSheet.tsx';
import { MembersSheet } from '../screens/home/MembersSheet.tsx';
import { ShareListSheet } from '../screens/home/ShareListSheet.tsx';
import { SettingsSheet } from '../screens/settings/SettingsSheet.tsx';
import { useOverlays, type Overlay } from './overlays.tsx';

type Render<K extends Overlay['kind']> = (overlay: Extract<Overlay, { kind: K }>) => ReactNode;
type Registry = { [K in Overlay['kind']]: Render<K> };

/** One entry per overlay kind. Add a line here when a new sheet is added. */
const REGISTRY: Registry = {
  settings: (o) => <SettingsSheet initialPage={o.page} />,
  'bill-form': (o) => <BillFormSheet billId={o.billId} />,
  'bill-detail': (o) => <BillDetailSheet billId={o.billId} />,
  item: (o) => <ItemSheet itemId={o.itemId} />,
  members: (o) => <MembersSheet initialPage={o.page} />,
  'list-form': (o) => <ListFormSheet listId={o.listId} />,
  'list-menu': (o) => <ListMenuSheet listId={o.listId} />,
  'share-list': (o) => <ShareListSheet listId={o.listId} />,
  goal: (o) => <GoalSheet goalId={o.goalId} />,
};

export function OverlayHost() {
  const { stack } = useOverlays();
  const top = stack[stack.length - 1];
  if (!top) return null;
  // The registry is indexed by kind; the cast is safe because each entry only accepts its own kind.
  const render = REGISTRY[top.kind] as (overlay: Overlay) => ReactNode;
  return <>{render(top)}</>;
}
