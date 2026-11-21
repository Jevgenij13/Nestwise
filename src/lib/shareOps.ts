import type { AppData, IsoTimestamp } from '../types.ts';
import { isLive } from './entities.ts';
import { MAX_LISTS, MAX_MEMBERS } from './limits.ts';
import { mergeCollection, mergeData, type MergeSummary } from './merge.ts';
import { err, ok, type Result } from './result.ts';
import { decodeAnyShareCode, parseEnvelope, type EnvelopeError } from './snapshot.ts';
import type { ValidatedData } from './validate.ts';

/** Importing a shared list (AC-HOME-10, 11): preview what a merge would do, then apply it. */

export interface ListImportPreview {
  exportedAt: IsoTimestamp;
  listId: string;
  listName: string;
  /** The list is not on this phone yet (or only as a tombstone that the incoming copy beats). */
  listIsNew: boolean;
  /** "3 new, 2 updated, 1 deleted": counted over the list's items (AC-HOME-11). */
  items: MergeSummary;
  /** Nothing at all would change (items, list or people), so importing again is a no-op. */
  upToDate: boolean;
  /** Names of people the snapshot brings that this phone does not know yet. */
  newMembers: string[];
  incoming: ValidatedData;
}

const CODE_START = /NW[12]\./;

/**
 * Reads pasted text or a chosen file's text: a whole JSON snapshot, a share code, or a link / message containing a code.
 * Anything else is an error and nothing changes.
 */
export async function parseSharedText(text: string): Promise<Result<ValidatedData & { exportedAt: IsoTimestamp }, EnvelopeError>> {
  const trimmed = text.trim();
  if (trimmed === '') return err({ code: 'not-nestwise', message: 'Nothing to import.' });
  const compact = trimmed.replace(/\s+/g, '');
  const at = trimmed.startsWith('{') ? -1 : compact.search(CODE_START);
  const parsed = at >= 0 ? await decodeAnyShareCode(compact.slice(at)) : parseEnvelope(trimmed);
  if (!parsed.ok) return parsed;
  if (parsed.value.scope !== 'list') return err({ code: 'invalid', message: 'This is a full backup, not a shared list. Use Import a backup instead.' });
  return ok({ ...parsed.value.data, exportedAt: parsed.value.exportedAt });
}

const liveCount = (rows: { deletedAt: string | null }[]) => rows.filter((r) => r.deletedAt === null).length;

/** What merging this snapshot would do. Changes nothing. Errors when the merge would break the list or member limits. */
export async function previewListImport(local: AppData, text: string, now: IsoTimestamp): Promise<Result<ListImportPreview, EnvelopeError>> {
  const parsed = await parseSharedText(text);
  if (!parsed.ok) return parsed;
  const incoming = parsed.value;
  const list = incoming.lists?.[0];
  if (!list) return err({ code: 'invalid', message: 'This shared list is empty.' });

  const merged = mergeData(local, incoming, now);
  if (liveCount(merged.data.lists) > MAX_LISTS) return err({ code: 'invalid', message: `You already have ${MAX_LISTS} lists. Delete one before importing another.` });
  if (liveCount(merged.data.members) > MAX_MEMBERS) return err({ code: 'invalid', message: `This would give the household more than ${MAX_MEMBERS} people. Remove someone in Home > Members first.` });

  const items = mergeCollection(local.items, incoming.items ?? []).summary;
  const knownMembers = new Set(local.members.filter(isLive).map((m) => m.id));
  return ok({
    exportedAt: incoming.exportedAt,
    listId: list.id,
    listName: list.name,
    listIsNew: !local.lists.some((l) => l.id === list.id && isLive(l)) && isLive(list),
    items,
    upToDate: merged.summary.added + merged.summary.updated + merged.summary.deleted === 0,
    newMembers: (incoming.members ?? []).filter((m) => isLive(m) && !knownMembers.has(m.id)).map((m) => m.name),
    incoming,
  });
}

/** Applies a previewed snapshot. Per item the newest `updatedAt` wins and tombstones stay deleted (D11). */
export function applyListImport(local: AppData, preview: ListImportPreview, now: IsoTimestamp): AppData {
  return mergeData(local, preview.incoming, now).data;
}

export function importSummaryText(items: MergeSummary): string {
  return `${items.added} new, ${items.updated} updated, ${items.deleted} deleted`;
}
