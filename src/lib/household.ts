import type { AppData, DateString, Household, IsoTimestamp, Item, List, ListType, Member, Repeat } from '../types.ts';
import { daysBetween, relativeDayText } from './dates.ts';
import { isLive, restore, softDelete } from './entities.ts';
import { DUE_SOON_CHORE_DAYS, MAX_LISTS, MAX_MEMBERS } from './limits.ts';
import { advanceOnce } from './recurrence.ts';
import { err, ok, type Result } from './result.ts';

export const MEMBER_NAME_MAX = 30;
export const LIST_NAME_MAX = 40;

/** Auto colours for members (AC-HOME-1); eight, matching the member limit. Same values as `--member-1..8` in tokens.css (white initials stay at least 4.5:1). */
export const MEMBER_COLOURS = ['#b04e27', '#3f6e8e', '#4f7455', '#8a5a9e', '#94681a', '#b03d62', '#2f7a77', '#6a6a2e'] as const;

export interface Stamp {
  now: IsoTimestamp;
  today: DateString;
}

export function liveMembers(members: Member[]): Member[] {
  return members.filter(isLive);
}

/** First palette colour not used by a live member; falls back to cycling. */
export function nextMemberColour(members: Member[]): string {
  const used = new Set(liveMembers(members).map((m) => m.colour));
  return MEMBER_COLOURS.find((c) => !used.has(c)) ?? MEMBER_COLOURS[liveMembers(members).length % MEMBER_COLOURS.length] ?? MEMBER_COLOURS[0];
}

export type NameError = 'required' | 'too-long' | 'limit-reached' | 'duplicate';

function cleanName(raw: string, max: number): Result<string, NameError> {
  const name = raw.trim();
  if (name === '') return err('required');
  return name.length > max ? err('too-long') : ok(name);
}

/** Member names are unique ignoring case (DESIGN 5.6); `exceptId` lets a member keep their own name when renaming. */
function nameTaken(members: Member[], name: string, exceptId?: string): boolean {
  const lower = name.toLowerCase();
  return liveMembers(members).some((m) => m.id !== exceptId && m.name.toLowerCase() === lower);
}

export function createMember(members: Member[], rawName: string, id: string, now: IsoTimestamp): Result<Member, NameError> {
  if (liveMembers(members).length >= MAX_MEMBERS) return err('limit-reached');
  const name = cleanName(rawName, MEMBER_NAME_MAX);
  if (!name.ok) return name;
  if (nameTaken(members, name.value)) return err('duplicate');
  return ok({ id, name: name.value, colour: nextMemberColour(members), createdAt: now, updatedAt: now, deletedAt: null });
}

/** Renames a member (AC-HOME-1). Past `doneBy` stamps keep the old name (AC-HOME-8). */
export function renameMember(members: Member[], memberId: string, rawName: string, now: IsoTimestamp): Result<Member[], NameError> {
  const name = cleanName(rawName, MEMBER_NAME_MAX);
  if (!name.ok) return name;
  if (nameTaken(members, name.value, memberId)) return err('duplicate');
  return ok(members.map((m) => (m.id === memberId && isLive(m) ? { ...m, name: name.value, updatedAt: now } : m)));
}

export function createList(lists: List[], rawName: string, type: ListType, id: string, now: IsoTimestamp): Result<List, NameError> {
  const live = lists.filter(isLive);
  if (live.length >= MAX_LISTS) return err('limit-reached');
  const name = cleanName(rawName, LIST_NAME_MAX);
  if (!name.ok) return name;
  const sortOrder = lists.reduce((max, l) => Math.max(max, l.sortOrder), -1) + 1;
  return ok({ id, name: name.value, type, sortOrder, createdAt: now, updatedAt: now, deletedAt: null });
}

export function renameList(lists: List[], listId: string, rawName: string, now: IsoTimestamp): Result<List[], NameError> {
  const name = cleanName(rawName, LIST_NAME_MAX);
  if (!name.ok) return name;
  return ok(lists.map((l) => (l.id === listId && isLive(l) ? { ...l, name: name.value, updatedAt: now } : l)));
}

export interface ListDelete {
  lists: List[];
  items: Item[];
  /** Ids of the items that were tombstoned with the list, so Undo restores exactly those. */
  itemIds: string[];
}

/** Deletes a list and its live items (tombstones, D11). */
export function deleteList(lists: List[], items: Item[], listId: string, now: IsoTimestamp): ListDelete {
  const itemIds: string[] = [];
  return {
    lists: lists.map((l) => (l.id === listId && isLive(l) ? softDelete(l, now) : l)),
    items: items.map((i) => {
      if (i.listId !== listId || !isLive(i)) return i;
      itemIds.push(i.id);
      return softDelete(i, now);
    }),
    itemIds,
  };
}

/** Undo for `deleteList` and `clearDone`: restores the list (if given) and exactly the items that were removed. */
export function restoreListItems(lists: List[], items: Item[], listId: string | null, itemIds: readonly string[], now: IsoTimestamp): { lists: List[]; items: Item[] } {
  const ids = new Set(itemIds);
  return {
    lists: listId === null ? lists : lists.map((l) => (l.id === listId ? restore(l, now) : l)),
    items: items.map((i) => (ids.has(i.id) ? restore(i, now) : i)),
  };
}

export interface NewHousehold {
  household: Household;
  member: Member;
  lists: [List, List];
}

/** First use of Home (AC-HOME-1, 2): household, first member, and one list of each type. */
export function createHousehold(input: { householdName: string; memberName: string; now: IsoTimestamp; ids: [string, string, string, string] }): Result<NewHousehold, NameError> {
  const householdName = cleanName(input.householdName, MEMBER_NAME_MAX);
  if (!householdName.ok) return householdName;
  const memberName = cleanName(input.memberName, MEMBER_NAME_MAX);
  if (!memberName.ok) return memberName;
  const { now, ids } = input;
  const base = { createdAt: now, updatedAt: now, deletedAt: null };
  return ok({
    household: { id: ids[0], name: householdName.value, ...base },
    member: { id: ids[1], name: memberName.value, colour: MEMBER_COLOURS[0], ...base },
    lists: [
      { id: ids[2], name: 'Chores', type: 'chore', sortOrder: 0, ...base },
      { id: ids[3], name: 'Shopping', type: 'shopping', sortOrder: 1, ...base },
    ],
  });
}

/** Keeps the current member valid: the stored one if still live, else the first live member, else null. */
export function resolveCurrentMemberId(members: Member[], currentId: string | null): string | null {
  const live = liveMembers(members);
  return live.find((m) => m.id === currentId)?.id ?? live[0]?.id ?? null;
}

/**
 * Removes a member (AC-HOME-8): tombstones the member, unassigns their tasks (assignee becomes Anyone),
 * and never deletes tasks. `doneBy` keeps the name at the time.
 */
export function removeMember(members: Member[], items: Item[], memberId: string, now: IsoTimestamp): { members: Member[]; items: Item[] } {
  return {
    members: members.map((m) => (m.id === memberId && isLive(m) ? softDelete(m, now) : m)),
    items: items.map((item) => {
      if (item.assigneeId !== memberId) return item;
      const { assigneeId: _removed, ...rest } = item;
      return { ...rest, updatedAt: now };
    }),
  };
}

/** Whole-data member removal: `removeMember` plus keeping the current member valid. The last remaining member cannot be removed. */
export function removeMemberFromData(data: AppData, memberId: string, now: IsoTimestamp): AppData {
  const live = liveMembers(data.members);
  if (live.length <= 1 || !live.some((m) => m.id === memberId)) return data;
  const { members, items } = removeMember(data.members, data.items, memberId, now);
  const currentMemberId = resolveCurrentMemberId(members, data.settings.currentMemberId === memberId ? null : data.settings.currentMemberId);
  return { ...data, members, items, settings: { ...data.settings, currentMemberId } };
}

/** Quick add (AC-HOME-3): trims; empty or whitespace-only text is ignored (null). */
export function createItem(input: { listId: string; title: string; qty?: string; assigneeId?: string; dueDate?: DateString; repeat?: Repeat; id: string; now: IsoTimestamp }): Item | null {
  const title = input.title.trim();
  if (title === '') return null;
  const item: Item = { id: input.id, listId: input.listId, title, done: false, createdAt: input.now, updatedAt: input.now, deletedAt: null };
  const qty = input.qty?.trim();
  if (qty) item.qty = qty;
  if (input.assigneeId) item.assigneeId = input.assigneeId;
  if (input.dueDate) item.dueDate = input.dueDate;
  if (input.repeat && input.repeat !== 'none') item.repeat = input.repeat;
  return item;
}

export interface DoneChange {
  item: Item;
  /** The next occurrence of a recurring chore, to be added to the list (AC-HOME-13). */
  next?: Item;
}

/**
 * Checks an item off or back on (AC-HOME-4). Checking stamps the current member and local date;
 * unchecking clears them. Checking a recurring chore also returns the next occurrence, due
 * previous due date + interval (or today + interval when it had no due date), even if completed late.
 */
export function setItemDone(item: Item, done: boolean, member: Member | null, stamp: Stamp, nextId: string): DoneChange {
  if (!done) {
    const { doneAt: _at, doneBy: _by, ...rest } = item;
    return { item: { ...rest, done: false, updatedAt: stamp.now } };
  }
  const completed: Item = { ...item, done: true, doneAt: stamp.today, updatedAt: stamp.now };
  if (member) completed.doneBy = { memberId: member.id, name: member.name };
  else delete completed.doneBy;

  if (!item.repeat || item.repeat === 'none') return { item: completed };
  const { doneAt: _at, doneBy: _by, ...base } = item;
  const next: Item = {
    ...base,
    id: nextId,
    done: false,
    dueDate: advanceOnce(item.dueDate ?? stamp.today, item.repeat),
    createdAt: stamp.now,
    updatedAt: stamp.now,
    deletedAt: null,
  };
  return { item: completed, next };
}

/** "Clear done" (AC-HOME-5): tombstones every live done item on the list. The caller keeps the previous array for Undo. */
export function clearDone(items: Item[], listId: string, now: IsoTimestamp): { items: Item[]; cleared: number; ids: string[] } {
  const ids: string[] = [];
  const next = items.map((item) => {
    if (item.listId !== listId || !isLive(item) || !item.done) return item;
    ids.push(item.id);
    return softDelete(item, now);
  });
  return { items: next, cleared: ids.length, ids };
}

export interface ItemEdit {
  title: string;
  qty?: string;
  assigneeId?: string;
  dueDate?: DateString;
  repeat?: Repeat;
}

/** Applies the item sheet (AC-HOME-6): trims the title (empty is rejected with null) and clears fields that are left unset. */
export function editItem(item: Item, edit: ItemEdit, now: IsoTimestamp): Item | null {
  const title = edit.title.trim();
  if (title === '') return null;
  const { qty: _q, assigneeId: _a, dueDate: _d, repeat: _r, ...rest } = item;
  const next: Item = { ...rest, title, updatedAt: now };
  const qty = edit.qty?.trim();
  if (qty) next.qty = qty;
  if (edit.assigneeId) next.assigneeId = edit.assigneeId;
  if (edit.dueDate) next.dueDate = edit.dueDate;
  if (edit.repeat && edit.repeat !== 'none') next.repeat = edit.repeat;
  return next;
}

export function assignItem(item: Item, assigneeId: string | undefined, now: IsoTimestamp): Item {
  const { assigneeId: _old, ...rest } = item;
  return assigneeId ? { ...rest, assigneeId, updatedAt: now } : { ...rest, updatedAt: now };
}

/** Open and done items of a list for display: open oldest first, done most recently completed first. */
export function itemsForList(items: Item[], listId: string): { open: Item[]; done: Item[] } {
  const inList = items.filter((i) => i.listId === listId && isLive(i));
  const open = inList.filter((i) => !i.done).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = inList.filter((i) => i.done).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { open, done };
}

/** Mine = assigned to the current member or to Anyone (AC-HOME-7). */
export function isMine(item: Item, currentMemberId: string | null): boolean {
  return item.assigneeId === undefined || item.assigneeId === currentMemberId;
}

export function filterChores(items: Item[], filter: 'all' | 'mine', currentMemberId: string | null): Item[] {
  return filter === 'all' ? items : items.filter((i) => isMine(i, currentMemberId));
}

/** Days from today to the due date (negative when overdue), or null without a due date. */
export function choreDaysUntil(item: Item, today: DateString): number | null {
  return item.dueDate === undefined ? null : daysBetween(today, item.dueDate);
}

/** "2 days overdue", "Today", "Tomorrow", "in 2 days"; null without a due date. */
export function choreDueText(item: Item, today: DateString): string | null {
  const days = choreDaysUntil(item, today);
  return days === null ? null : relativeDayText(days);
}

/** Today tab chores (AC-HOME-9): open chores in chore lists, mine, due within 2 days or overdue; most overdue first. */
export function dueSoonChores(items: Item[], lists: List[], currentMemberId: string | null, today: DateString): Item[] {
  const choreListIds = new Set(lists.filter((l) => isLive(l) && l.type === 'chore').map((l) => l.id));
  return items
    .filter((item) => {
      if (!isLive(item) || item.done || !choreListIds.has(item.listId) || !isMine(item, currentMemberId)) return false;
      const days = choreDaysUntil(item, today);
      return days !== null && days <= DUE_SOON_CHORE_DAYS;
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.createdAt.localeCompare(b.createdAt));
}

/** Open items in display order: shopping newest first (the new row appears on top, DESIGN 5.5); chores by due date, undated last, newest first within a day. */
export function orderOpenItems(open: Item[], type: ListType): Item[] {
  const newestFirst = [...open].reverse();
  if (type === 'shopping') return newestFirst;
  return newestFirst.sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'));
}

export type ChoreUrgency = 'overdue' | 'soon' | 'later' | 'none';

/** How an open chore is flagged: overdue (red), due within 2 days or today (amber, AC-HOME-9), or plain. */
export function choreUrgency(item: Item, today: DateString): ChoreUrgency {
  const days = choreDaysUntil(item, today);
  if (days === null) return 'none';
  return days < 0 ? 'overdue' : days <= DUE_SOON_CHORE_DAYS ? 'soon' : 'later';
}

export interface ListSummary {
  open: number;
  /** Open chores the current member should look at: overdue or due within 2 days, mine or Anyone (same rule as Today). */
  dueSoon: number;
  overdue: number;
}

/** Counts for the Home overview rows. */
export function listSummary(items: Item[], list: List, currentMemberId: string | null, today: DateString): ListSummary {
  const open = items.filter((i) => i.listId === list.id && isLive(i) && !i.done);
  if (list.type !== 'chore') return { open: open.length, dueSoon: 0, overdue: 0 };
  const mine = open.filter((i) => isMine(i, currentMemberId));
  const overdue = mine.filter((i) => choreUrgency(i, today) === 'overdue').length;
  const soon = mine.filter((i) => choreUrgency(i, today) === 'soon').length;
  return { open: open.length, dueSoon: overdue + soon, overdue };
}
