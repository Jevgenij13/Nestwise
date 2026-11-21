import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

interface GroupProps {
  title?: string;
  testId: string;
  children: ReactNode;
  /** Plain list of `ListRow`s (adds the `ul`). Pass `rows={false}` for other content. */
  rows?: boolean;
  footer?: ReactNode;
  /** Makes the title a toggle that hides the rows (Paused group, DESIGN 5.2). */
  collapsible?: { open: boolean; onToggle: () => void };
}

/** Grouped section: caps header above a card of rows with inset separators (DESIGN 4.8). */
export function Group({ title, testId, children, rows = true, footer, collapsible }: GroupProps) {
  const body = rows ? <ul className="card list">{children}</ul> : <div className="card">{children}</div>;
  return (
    <section className="group" data-testid={testId}>
      {title &&
        (collapsible ? (
          <h2 className="t-section group__title">
            <button type="button" className="group__toggle tap-target" aria-expanded={collapsible.open} onClick={collapsible.onToggle} data-testid={`${testId}-toggle`}>
              {title}
              <Icon name={collapsible.open ? 'chevron-down' : 'chevron-right'} size={16} />
            </button>
          </h2>
        ) : (
          <h2 className="t-section group__title">{title}</h2>
        ))}
      {(!collapsible || collapsible.open) && body}
      {footer && <p className="group__footer t-footnote">{footer}</p>}
    </section>
  );
}
