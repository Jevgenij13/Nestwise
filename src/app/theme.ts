import { useEffect } from 'react';
import type { Appearance } from '../types.ts';

/** Applies the appearance setting: no attribute follows the system, light/dark force a theme (AC-APP-4, DESIGN 9). */
export function applyAppearance(appearance: Appearance, root: HTMLElement = document.documentElement): void {
  if (appearance === 'system') delete root.dataset.theme;
  else root.dataset.theme = appearance;
}

export function useAppearance(appearance: Appearance): void {
  useEffect(() => applyAppearance(appearance), [appearance]);
}
