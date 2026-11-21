import { dismissedRecently } from './prefs.ts';

export interface InstallContext {
  /** `navigator.standalone`: true when launched from the Home Screen, false in a Safari tab, undefined off iOS. */
  navigatorStandalone: boolean | undefined;
  /** `matchMedia('(display-mode: standalone)')`. */
  displayModeStandalone: boolean;
}

/** True in a regular iOS Safari tab (AC-APP-2); never in standalone mode and never on browsers without `navigator.standalone`. */
export function isInstallablePage(ctx: InstallContext): boolean {
  return ctx.navigatorStandalone === false && !ctx.displayModeStandalone;
}

export function shouldShowInstallBanner(ctx: InstallContext, dismissedAt: string | undefined, now: Date): boolean {
  return isInstallablePage(ctx) && !dismissedRecently(dismissedAt, now);
}

export function readInstallContext(): InstallContext {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { standalone?: boolean }) : undefined;
  return {
    navigatorStandalone: nav?.standalone,
    displayModeStandalone: typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches,
  };
}
