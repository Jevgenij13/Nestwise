import { useEffect } from 'react';

/**
 * iOS standalone does not resize the layout for the keyboard (DESIGN 9). Mirror the visual viewport into CSS
 * variables so the app root, sheets and quick-add bars sit above the keyboard:
 *   --vv-top / --vv-height: the visible box; html[data-keyboard="open"]: keyboard is up (tab bar hides).
 */
const KEYBOARD_MIN_PX = 120;

export function useVisualViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const update = () => {
      const height = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;
      root.style.setProperty('--vv-height', `${Math.round(height)}px`);
      root.style.setProperty('--vv-top', `${Math.round(top)}px`);
      const covered = window.innerHeight - height - top;
      const typing = document.activeElement instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (covered > KEYBOARD_MIN_PX || (typing && covered > 0)) root.dataset.keyboard = 'open';
      else delete root.dataset.keyboard;
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      root.style.removeProperty('--vv-height');
      root.style.removeProperty('--vv-top');
      delete root.dataset.keyboard;
    };
  }, []);
}
