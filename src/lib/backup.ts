import type { AppData, DateString, IsoTimestamp } from '../types.ts';
import { isLive } from './entities.ts';
import { mergeData, type MergeSummary } from './merge.ts';
import { createEnvelope, parseEnvelope, type EnvelopeError } from './snapshot.ts';
import { err, ok, type Result } from './result.ts';

/** Full-data backup (AC-APP-8, 9). */

export function backupFilename(today: DateString): string {
  return `nestwise-backup-${today}.json`;
}

export function createBackup(data: AppData, now: IsoTimestamp): string {
  return JSON.stringify(createEnvelope('all', data, now), null, 2);
}

export interface BackupCounts {
  bills: number;
  members: number;
  lists: number;
  items: number;
  goals: number;
}

/** Live-entity counts for the import preview. */
export function countData(data: AppData): BackupCounts {
  return {
    bills: data.bills.filter(isLive).length,
    members: data.members.filter(isLive).length,
    lists: data.lists.filter(isLive).length,
    items: data.items.filter(isLive).length,
    goals: data.goals.filter(isLive).length,
  };
}

export interface BackupPreview {
  exportedAt: IsoTimestamp;
  counts: BackupCounts;
  incoming: AppData;
}

/** Validates backup text for the import dialog. Changes nothing. */
export function previewBackup(text: string): Result<BackupPreview, EnvelopeError> {
  const parsed = parseEnvelope(text);
  if (!parsed.ok) return parsed;
  if (parsed.value.scope !== 'all') return err({ code: 'invalid', message: 'This is a single shared list, not a full backup. Use Settings > Import a shared list instead.' });
  return ok({ exportedAt: parsed.value.exportedAt, counts: countData(parsed.value.data), incoming: parsed.value.data });
}

export type RestoreMode = 'replace' | 'merge';

/**
 * Applies a validated backup. Replace swaps everything, including settings; Merge combines per id by
 * newest `updatedAt` (D11) and keeps this device's settings.
 */
export function restoreBackup(local: AppData, incoming: AppData, mode: RestoreMode, now: IsoTimestamp): { data: AppData; summary?: MergeSummary } {
  if (mode === 'replace') return { data: incoming };
  return mergeData(local, incoming, now);
}
