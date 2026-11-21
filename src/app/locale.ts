/** Device language tags, most preferred first. Empty outside a browser. */
export function deviceLocales(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

/** Locale for number and date formatting (AC-GOAL-8: the device locale). */
export function deviceLocale(): string | undefined {
  return deviceLocales()[0];
}
