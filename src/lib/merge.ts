import type { AppData, EntityBase, IsoTimestamp } from '../types.ts';
import { COLLECTION_KEYS, isLive, purgeTombstones } from './entities.ts';
import type { ValidatedData } from './validate.ts';

/** What a merge did, counted per entity across all collections (AC-HOME-11 preview: "3 new, 2 updated, 1 deleted"). */
export interface MergeSummary {
  added: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

const emptySummary = (): MergeSummary => ({ added: 0, updated: 0, deleted: 0, unchanged: 0 });

/**
 * Per-id merge, newest `updatedAt` wins (D11). Ties keep the local copy, so importing the same
 * snapshot twice is a no-op. A newer tombstone beats an older live copy and vice versa.
 * Local order is kept; new entities are appended.
 */
export function mergeCollection<T extends EntityBase>(local: T[], incoming: T[]): { merged: T[]; summary: MergeSummary } {
  const summary = emptySummary();
  const merged = [...local];
  const indexById = new Map(local.map((entity, i) => [entity.id, i]));

  for (const entity of incoming) {
    const at = indexById.get(entity.id);
    if (at === undefined) {
      indexById.set(entity.id, merged.length);
      merged.push(entity);
      if (isLive(entity)) summary.added++;
      else summary.unchanged++;
      continue;
    }
    const current = merged[at] as T;
    if (Date.parse(entity.updatedAt) <= Date.parse(current.updatedAt)) {
      summary.unchanged++;
      continue;
    }
    merged[at] = entity;
    if (!isLive(current) && isLive(entity)) summary.added++;
    else if (isLive(current) && !isLive(entity)) summary.deleted++;
    else if (isLive(entity)) summary.updated++;
    else summary.unchanged++;
  }
  return { merged, summary };
}

/**
 * Merges incoming collections into local data. Collections absent from `incoming` are untouched
 * (a single-list snapshot only carries lists, items and members). Settings stay local (they are
 * per-device); the household name follows the newer `updatedAt`. Tombstones older than 30 days are purged afterwards.
 */
export function mergeData(local: AppData, incoming: ValidatedData, now: IsoTimestamp): { data: AppData; summary: MergeSummary } {
  const data: AppData = { ...local };
  const summary = emptySummary();

  for (const key of COLLECTION_KEYS) {
    const theirs = incoming[key];
    if (!theirs) continue;
    const result = mergeCollection(local[key] as EntityBase[], theirs as EntityBase[]);
    (data[key] as EntityBase[]) = result.merged;
    for (const field of Object.keys(summary) as (keyof MergeSummary)[]) summary[field] += result.summary[field];
  }

  const theirHousehold = incoming.household;
  if (theirHousehold) {
    if (local.household === null) data.household = theirHousehold;
    else if (local.household.id === theirHousehold.id && Date.parse(theirHousehold.updatedAt) > Date.parse(local.household.updatedAt)) data.household = theirHousehold;
  }

  return { data: purgeTombstones(data, now), summary };
}
