import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button.tsx';
import { trapTab } from './focus.ts';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId: string;
}

/** iOS-style alert (270 pt), used for Discard changes and Remove member only (DESIGN 4.8). */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel, destructive, onConfirm, onCancel, testId }: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div className="vv-layer vv-layer--dialog">
      <div
        ref={ref}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          } else trapTab(e, ref.current);
        }}
      >
        <h2 className="t-headline" id={`${testId}-title`}>{title}</h2>
        <p className="t-subhead">{children}</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onCancel} data-testid={`${testId}-cancel`}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} data-testid={`${testId}-confirm`}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
