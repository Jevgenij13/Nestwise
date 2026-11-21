import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  actionLabel?: string;
  durationMs: number;
  onAction: () => void;
}

/** Inverted pill with an optional Undo (DESIGN 4.7). `role="status"` so VoiceOver announces it. */
export function Toast({ message, actionLabel, durationMs, onAction }: ToastProps) {
  return createPortal(
    <div className="vv-layer vv-layer--toast">
      <div className="toast" role="status" aria-live="polite" data-testid="toast">
        <span className="toast__text" data-testid="toast-message">{message}</span>
        {actionLabel && (
          <button type="button" className="toast__action tap-target" onClick={onAction} data-testid="toast-action">
            {actionLabel}
          </button>
        )}
        <span className="toast__timer" style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />
      </div>
    </div>,
    document.body,
  );
}
