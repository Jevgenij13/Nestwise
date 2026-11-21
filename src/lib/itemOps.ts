import type { AppData, Item, IsoTimestamp } from '../types.ts';
import { softDelete } from './entities.ts';
import { setItemDone, type Stamp } from './household.ts';
import type { DateString } from '../types.ts';

/**
 * Checks a chore or shopping item on or off inside the whole data set (AC-HOME-4). Checking a recurring chore
 * also appends its next occurrence (AC-HOME-13); `undoItemDone` reverses both.
 */
export interface ItemDoneResult {
  data: AppData;
  /** Id of the next occurrence that was created, if any. */
  createdId?: string;
}

export function checkItem(data: AppData, itemId: string, done: boolean, today: DateString, now: IsoTimestamp, nextId: string): ItemDoneResult {
  const item = data.items.find((i) => i.id === itemId);
  if (!item || item.deletedAt !== null) return { data };
  const member = data.members.find((m) => m.id === data.settings.currentMemberId && m.deletedAt === null) ?? null;
  const stamp: Stamp = { now, today };
  const change = setItemDone(item, done, member, stamp, nextId);
  const items: Item[] = data.items.map((i) => (i.id === itemId ? change.item : i));
  if (change.next) items.push(change.next);
  return { data: { ...data, items }, createdId: change.next?.id };
}

/** Undo for `checkItem`: restores the previous item exactly and tombstones a created next occurrence. */
export function undoItemDone(data: AppData, previous: Item, createdId: string | undefined, now: IsoTimestamp): AppData {
  const items = data.items.map((i) => {
    if (i.id === previous.id) return { ...previous, updatedAt: now };
    if (createdId !== undefined && i.id === createdId) return softDelete(i, now);
    return i;
  });
  return { ...data, items };
}
