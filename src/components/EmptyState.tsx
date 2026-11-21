import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body: string;
  testId: string;
  /** At most one primary action. */
  action?: ReactNode;
  secondary?: ReactNode;
}

export function EmptyState({ icon, title, body, testId, action, secondary }: EmptyStateProps) {
  return (
    <div className="empty" data-testid={testId}>
      <span className="empty__icon">
        <Icon name={icon} size={32} />
      </span>
      <h2 className="t-title-3 empty__title">{title}</h2>
      <p className="t-subhead empty__body">{body}</p>
      {action}
      {secondary}
    </div>
  );
}
