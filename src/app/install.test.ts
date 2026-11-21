import { describe, expect, it } from 'vitest';
import { isInstallablePage, shouldShowInstallBanner } from './install.ts';
import { dismissedRecently, loadPrefs, PREFS_KEY, savePrefs } from './prefs.ts';

const NOW = new Date('2026-11-21T12:00:00Z');

describe('install banner (AC-APP-2)', () => {
  it('shows in a Safari tab, never in standalone mode', () => {
    expect(isInstallablePage({ navigatorStandalone: false, displayModeStandalone: false })).toBe(true);
    expect(isInstallablePage({ navigatorStandalone: true, displayModeStandalone: false })).toBe(false);
    expect(isInstallablePage({ navigatorStandalone: false, displayModeStandalone: true })).toBe(false);
  });

  it('is not shown on browsers without navigator.standalone', () => {
    expect(isInstallablePage({ navigatorStandalone: undefined, displayModeStandalone: false })).toBe(false);
  });

  it('stays hidden for 7 days after dismissal', () => {
    const ctx = { navigatorStandalone: false, displayModeStandalone: false };
    expect(shouldShowInstallBanner(ctx, '2026-11-15T12:00:01Z', NOW)).toBe(false);
    expect(shouldShowInstallBanner(ctx, '2026-11-14T12:00:00Z', NOW)).toBe(true);
    expect(shouldShowInstallBanner(ctx, undefined, NOW)).toBe(true);
  });
});

describe('prefs', () => {
  const backend = () => {
    const map = new Map<string, string>();
    return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  };

  it('defaults to Today and restores the saved tab', () => {
    const b = backend();
    expect(loadPrefs(b).lastTab).toBe('today');
    savePrefs({ lastTab: 'bills' }, b);
    expect(loadPrefs(b).lastTab).toBe('bills');
  });

  it('ignores garbage and never throws', () => {
    const b = backend();
    b.map.set(PREFS_KEY, '{"lastTab":"nope","installDismissedAt":5}');
    expect(loadPrefs(b)).toEqual({ lastTab: 'today' });
    b.map.set(PREFS_KEY, 'not json');
    expect(loadPrefs(b).lastTab).toBe('today');
    expect(() => savePrefs({ lastTab: 'home' }, { ...b, setItem: () => { throw new Error('x'); } })).not.toThrow();
    expect(loadPrefs(null).lastTab).toBe('today');
  });

  it('dismissedRecently handles bad timestamps', () => {
    expect(dismissedRecently('garbage', NOW)).toBe(false);
  });
});
