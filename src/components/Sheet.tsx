import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReportDirty } from '../app/dirty.ts';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { trapTab } from './focus.ts';

export interface SheetProps {
  title: string;
  /** Final close. Called after Cancel, scrim tap, Escape or drag-down (and after Discard when dirty). */
  onClose: () => void;
  closeLabel?: string;
  /** Right-hand header action (e.g. Edit, Save). */
  headerAction?: ReactNode;
  /** Sticky footer, pinned above the keyboard. */
  footer?: ReactNode;
  /** Unsaved input: dismissing asks "Discard changes?" and holds back app updates. */
  dirty?: boolean;
  detent?: 'large' | 'medium';
  testId: string;
  children: ReactNode;
}

const DRAG_CLOSE_PX = 110;
const SHELL_ID = 'app-shell';

/**
 * Bottom sheet (DESIGN 4.3): role=dialog + aria-modal, focus trap, focus returns to the trigger, Escape / scrim /
 * drag-down dismiss, safe-area aware, sized to the visual viewport so the footer rides above the keyboard.
 * While open the rest of the app is `inert`.
 */
export function Sheet({ title, onClose, closeLabel = 'Cancel', headerAction, footer, dirty = false, detent = 'large', testId, children }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; id: number } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useReportDirty(dirty);

  // Focus management and inert background.
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const shell = document.getElementById(SHELL_ID);
    shell?.setAttribute('inert', '');
    const sheet = sheetRef.current;
    if (sheet && !sheet.contains(document.activeElement)) sheet.focus();
    return () => {
      shell?.removeAttribute('inert');
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const onDragStart = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startY: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - drag.startY);
    sheetRef.current.style.transform = `translateY(${dy}px)`;
    sheetRef.current.style.transition = 'none';
  };
  const onDragEnd = (e: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !sheetRef.current) return;
    const dy = e.clientY - drag.startY;
    sheetRef.current.style.transform = '';
    sheetRef.current.style.transition = '';
    if (dy > DRAG_CLOSE_PX) requestClose();
  };

  return createPortal(
    <div className="vv-layer vv-layer--sheet">
      <div className="scrim" onClick={requestClose} data-testid={`${testId}-scrim`} />
      <div
        ref={sheetRef}
        className={`sheet sheet--${detent}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        tabIndex={-1}
        data-testid={testId}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !confirmDiscard) {
            e.stopPropagation();
            requestClose();
          } else if (!confirmDiscard) trapTab(e, sheetRef.current);
        }}
      >
        <header className="sheet__header" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          <span className="sheet__grabber" aria-hidden="true" />
          <div className="sheet__bar">
            <button type="button" className="sheet__side sheet__side--left tap-target pressable" onClick={requestClose} data-testid={`${testId}-close`}>
              {closeLabel}
            </button>
            <h2 className="sheet__title t-headline" id={`${testId}-title`} data-testid={`${testId}-title`}>{title}</h2>
            <div className="sheet__side sheet__side--right">{headerAction}</div>
          </div>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__footer">{footer}</footer>}
      </div>
      {confirmDiscard && (
        <ConfirmDialog
          title="Discard changes?"
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          destructive
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
          testId="discard-dialog"
        >
          What you typed will be lost.
        </ConfirmDialog>
      )}
    </div>,
    document.body,
  );
}
