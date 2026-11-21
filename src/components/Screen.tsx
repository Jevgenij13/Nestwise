import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';
import { IconButton } from './Button.tsx';
import { useOverlays } from '../app/overlays.tsx';

interface ScreenProps {
  title: string;
  subtitle?: string;
  testId: string;
  children: ReactNode;
  /** Floating add pill, bottom right above the tab bar. */
  fab?: ReactNode;
  /** Extra content on the left of the gear (e.g. a member chip). */
  barAction?: ReactNode;
  /** "< Home" button at the top left of a pushed screen. */
  back?: { label: string; onPress: () => void };
  /** Pinned below the scrolling content, above the tab bar (quick-add field). */
  footer?: ReactNode;
}

const COLLAPSE_AT_PX = 28;

/**
 * Tab screen frame (DESIGN 3.1): sticky blurred bar with the collapsing title and the Settings gear,
 * a large title in the scroll content, and safe-area aware bottom padding.
 */
export function Screen({ title, subtitle, testId, children, fab, barAction, back, footer }: ScreenProps) {
  const { open } = useOverlays();
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCollapsed(el.scrollTop > COLLAPSE_AT_PX);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="screen" data-testid={testId}>
      <div className={`screen__bar${collapsed ? ' screen__bar--collapsed' : ''}`}>
        {back && (
          <button type="button" className="screen__back tap-target pressable" onClick={back.onPress} data-testid="back-button">
            <Icon name="chevron-left" size={22} />
            {back.label}
          </button>
        )}
        <span className="screen__bar-title t-headline" aria-hidden="true">{title}</span>
        <div className="screen__bar-actions">
          {barAction}
          <IconButton aria-label="Settings" onClick={() => open({ kind: 'settings' })} data-testid="settings-button">
            <Icon name="gear" size={24} />
          </IconButton>
        </div>
      </div>
      <div className="screen__scroll" ref={scrollRef} data-scroll-root>
        <div className="screen__content">
          <header className="screen__head">
            <h1 className="t-large-title" data-testid="screen-title">{title}</h1>
            {subtitle && <p className="t-callout screen__subtitle" data-testid="screen-subtitle">{subtitle}</p>}
          </header>
          {children}
        </div>
      </div>
      {footer && <div className="screen__footer">{footer}</div>}
      {fab && <div className="screen__fab">{fab}</div>}
    </div>
  );
}
