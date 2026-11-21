import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';
import { IconButton } from './Button.tsx';

interface BannerProps {
  tone: 'info' | 'warning' | 'danger';
  icon: IconName;
  testId: string;
  children: ReactNode;
  /** With onDismiss a 44 pt close button is shown. */
  onDismiss?: () => void;
  action?: ReactNode;
}

export function Banner({ tone, icon, testId, children, onDismiss, action }: BannerProps) {
  return (
    <div className={`banner banner--${tone}`} data-testid={testId}>
      <span className="banner__icon"><Icon name={icon} size={22} /></span>
      <div className="banner__body">
        {children}
        {action}
      </div>
      {onDismiss && (
        <IconButton aria-label="Dismiss" onClick={onDismiss} data-testid={`${testId}-dismiss`}>
          <Icon name="close" size={20} />
        </IconButton>
      )}
    </div>
  );
}
