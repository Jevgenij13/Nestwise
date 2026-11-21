import type { AppData } from '../types.ts';
import { isLive } from '../lib/entities.ts';
import { dismissedRecently } from './prefs.ts';
import type { PersistState } from './store.ts';

const NUDGE_AFTER_DAYS = 30;

export interface Nudge {
  /** Days since the last backup, or null when there never was one. */
  daysSinceBackup: number | null;
  /** The browser did not grant persistent storage, so the phone may clear data when space is low (AC-APP-7). */
  atRisk: boolean;
}

export function hasUserData(data: AppData): boolean {
  return data.bills.some(isLive) || data.items.some(isLive) || data.goals.some(isLive) || data.lists.some(isLive);
}

/**
 * Backup nudge (AC-APP-16): when there is data and no backup in the last 30 days, or when storage is not
 * guaranteed. Returns null when nothing should be shown (no data, recent backup, or dismissed within 7 days).
 */
export function backupNudge(data: AppData, persist: PersistState, now: Date, dismissedAt: string | undefined): Nudge | null {
  if (!hasUserData(data) || dismissedRecently(dismissedAt, now)) return null;
  const last = data.settings.lastBackupAt;
  const days = last === null ? null : Math.floor((now.getTime() - Date.parse(last)) / 86_400_000);
  const stale = days === null || days >= NUDGE_AFTER_DAYS;
  const atRisk = persist === 'denied' || persist === 'unsupported';
  return stale || atRisk ? { daysSinceBackup: days, atRisk } : null;
}
