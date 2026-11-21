/** App icon badge, best effort (AC-APP-15). iOS 16.4+ installed apps expose `navigator.setAppBadge` and need notification permission. */

type BadgeNavigator = Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export function badgeSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as BadgeNavigator).setAppBadge === 'function';
}

export type BadgePermission = 'granted' | 'denied' | 'unsupported';

/** Asks for permission from a tap. Returns 'unsupported' when the browser has no badge API or no Notification API. */
export async function requestBadgePermission(): Promise<BadgePermission> {
  if (!badgeSupported() || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function updateBadge(count: number): Promise<void> {
  if (!badgeSupported()) return;
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    // Best effort: a failed badge never breaks the app.
  }
}
