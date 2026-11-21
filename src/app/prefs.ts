import { browserStorage, type StorageBackend } from '../lib/storage.ts';

/**
 * Per-device UI preferences that are not user data and are not part of backups: the last open tab and
 * banner dismissals. Kept under a separate key so the data envelope stays exactly the PRD model.
 */
export const PREFS_KEY = 'nestwise.ui';

export type TabId = 'today' | 'bills' | 'home' | 'goals';
export const TAB_IDS: readonly TabId[] = ['today', 'bills', 'home', 'goals'];

export interface Prefs {
  lastTab: TabId;
  /** ISO timestamps of the last dismissal; banners return after 7 days (DESIGN 5.11, 5.1). */
  installDismissedAt?: string;
  backupNudgeDismissedAt?: string;
  /** All / Mine choice remembered per chore list (AC-HOME-7, DESIGN 5.5). */
  choreFilters?: Record<string, ChoreFilter>;
}

export type ChoreFilter = 'all' | 'mine';

const DEFAULTS: Prefs = { lastTab: 'today' };

export function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && (TAB_IDS as readonly string[]).includes(value);
}

export function loadPrefs(backend: StorageBackend | null = browserStorage()): Prefs {
  try {
    const raw = backend?.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS };
    const p = parsed as Record<string, unknown>;
    const prefs: Prefs = { lastTab: isTabId(p.lastTab) ? p.lastTab : DEFAULTS.lastTab };
    if (typeof p.installDismissedAt === 'string') prefs.installDismissedAt = p.installDismissedAt;
    if (typeof p.backupNudgeDismissedAt === 'string') prefs.backupNudgeDismissedAt = p.backupNudgeDismissedAt;
    if (typeof p.choreFilters === 'object' && p.choreFilters !== null) {
      const entries = Object.entries(p.choreFilters).filter(([, v]) => v === 'all' || v === 'mine') as [string, ChoreFilter][];
      prefs.choreFilters = Object.fromEntries(entries);
    }
    return prefs;
  } catch {
    return { ...DEFAULTS };
  }
}

/** Merges the patch into the stored prefs. Failures are ignored: prefs are a convenience. */
export function savePrefs(patch: Partial<Prefs>, backend: StorageBackend | null = browserStorage()): Prefs {
  const next = { ...loadPrefs(backend), ...patch };
  try {
    backend?.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore: the app works without remembered prefs.
  }
  return next;
}

const DISMISS_DAYS = 7;

/** True while a dismissal is less than 7 days old. */
export function dismissedRecently(dismissedAt: string | undefined, now: Date): boolean {
  if (!dismissedAt) return false;
  const at = Date.parse(dismissedAt);
  return !Number.isNaN(at) && now.getTime() - at < DISMISS_DAYS * 86_400_000;
}
