import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';
import { swipeRows, useRowOpen } from './swipe.ts';

export interface SwipeAction {
  key: string;
  label: string;
  icon: IconName;
  tone: 'edit' | 'pause' | 'delete' | 'resume';
  onAction: () => void;
  testId: string;
}

interface ListRowProps {
  /** Unique across the screen; used for swipe coordination. */
  id: string;
  testId: string;
  onPress: () => void;
  /** Full sentence for VoiceOver, e.g. "Netflix, 9.99 per month, due in 3 days, Saturday 24 November". */
  ariaLabel?: string;
  leading?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  muted?: boolean;
  /** Done: struck-through title (with `muted`). */
  struck?: boolean;
  /**
   * Swipe-left actions in display order; the LAST one is the rightmost and runs on a full swipe (Delete).
   * Every action must also exist in the row's detail/edit sheet: swipe is a shortcut, never the only path.
   */
  actions?: readonly SwipeAction[];
}

const ACTION_WIDTH = 76;
const OPEN_THRESHOLD = 72;
const AXIS_LOCK_PX = 8;
/** Vertical scroll wins when the gesture is more than 30 degrees off horizontal: tan(30) = 0.577. */
const MAX_ANGLE_TAN = 0.577;

interface Gesture {
  x: number;
  y: number;
  base: number;
  axis: 'h' | 'v' | null;
  raw: number;
  pointerId: number;
}

/** List row (DESIGN 4.2): the whole row is a button; optional swipe actions via pointer events (`touch-action: pan-y`). */
export function ListRow({ id, testId, onPress, ariaLabel, leading, title, subtitle, trailing, muted = false, struck = false, actions = [] }: ListRowProps) {
  const open = useRowOpen(id);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const reveal = actions.length * ACTION_WIDTH;

  const setOffset = (px: number | null) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = surfaceRef.current;
      if (!el) return;
      el.style.transition = px === null ? '' : 'none';
      el.style.transform = px === null ? '' : `translateX(${px}px)`;
    });
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reveal === 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    gesture.current = { x: e.clientX, y: e.clientY, base: open ? -reveal : 0, axis: null, raw: 0, pointerId: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      g.axis = Math.abs(dy) <= Math.abs(dx) * MAX_ANGLE_TAN ? 'h' : 'v';
      if (g.axis === 'h') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (g.axis !== 'h') return;
    g.raw = g.base + dx;
    // Rubber-band past the actions; never drag right of the resting position.
    const shown = g.raw > 0 ? 0 : g.raw < -reveal ? -reveal + (g.raw + reveal) * 0.4 : g.raw;
    setOffset(shown);
  };

  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== 'h') return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 50);
    setOffset(null);
    const width = e.currentTarget.getBoundingClientRect().width;
    const last = actions[actions.length - 1];
    if (last && g.raw < -Math.max(reveal + 60, width * 0.55)) {
      swipeRows.close();
      last.onAction();
    } else if (g.raw < -OPEN_THRESHOLD || (g.base < 0 && g.raw < -reveal + OPEN_THRESHOLD)) {
      swipeRows.open(id);
    } else {
      swipeRows.close();
    }
  };

  return (
    <li className={`row${muted ? ' row--muted' : ''}${struck ? ' row--struck' : ''}${open ? ' row--open' : ''}`} data-row-id={id} data-testid={testId} style={{ '--reveal': `${reveal}px` } as React.CSSProperties}>
      {actions.length > 0 && (
        <div className="row__actions" inert={!open}>
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`row__action row__action--${action.tone}`}
              onClick={() => {
                swipeRows.close();
                action.onAction();
              }}
              data-testid={action.testId}
            >
              <Icon name={action.icon} size={22} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={surfaceRef} className="row__surface" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}>
        {leading && <div className="row__leading">{leading}</div>}
        <button
          type="button"
          className="row__main pressable"
          aria-label={ariaLabel}
          onClick={() => {
            if (suppressClick.current) return;
            if (open) swipeRows.close();
            else onPress();
          }}
          onKeyDown={(e) => {
            if (actions.length === 0) return;
            if (e.key === 'ArrowLeft') swipeRows.open(id);
            else if (e.key === 'ArrowRight' || e.key === 'Escape') swipeRows.close();
          }}
        >
          <span className="row__text">
            <span className="row__title t-headline">{title}</span>
            {subtitle && <span className="row__subtitle t-subhead">{subtitle}</span>}
          </span>
          {trailing && <span className="row__trailing">{trailing}</span>}
        </button>
      </div>
    </li>
  );
}
