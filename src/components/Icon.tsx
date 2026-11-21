import type { ReactNode } from 'react';

/** Hand-drawn outline icons: 24 px grid, 1.75 px stroke, round caps (DESIGN 2.5). No icon font. */
export type IconName =
  | 'today' | 'bills' | 'home' | 'goals' | 'gear' | 'plus' | 'chevron-right' | 'chevron-down' | 'check' | 'clock' | 'warning'
  | 'pause' | 'play' | 'trash' | 'pencil' | 'share' | 'repeat' | 'person' | 'calendar' | 'close' | 'info' | 'receipt' | 'lock' | 'search' | 'more' | 'chevron-left' | 'cart' | 'checklist' | 'qr' | 'link';

/** `fill` is the closed shape that gets the soft fill in the active (filled) variant. */
const SHAPES: Record<IconName, { fill?: string; stroke: string }> = {
  today: { fill: 'M6 4.5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3z', stroke: 'M3 9.5h18M8 3v3M16 3v3M8.5 15l2.5 2.5 4.5-5' },
  bills: { fill: 'M6 3h12v18l-2.5-1.5L13 21l-2-1.5L9 21l-2.5-1.5L4.5 21V4.5A1.5 1.5 0 0 1 6 3z', stroke: 'M8.5 8h7M8.5 12h7M8.5 16h4' },
  home: { fill: 'M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z', stroke: 'M10 20.5v-5h4v5' },
  goals: { fill: 'M5 4h11l-1.8 3.5L16 11H5z', stroke: 'M5 21V4' },
  gear: {
    stroke: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h.1a1.6 1.6 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1H19a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  },
  plus: { stroke: 'M12 5v14M5 12h14' },
  'chevron-right': { stroke: 'M9 5l7 7-7 7' },
  'chevron-down': { stroke: 'M5 9l7 7 7-7' },
  check: { stroke: 'M5 12.5l4.5 4.5L19 7.5' },
  clock: { stroke: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  warning: { stroke: 'M10.3 4.2 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9.5v4M12 17h.01' },
  pause: { stroke: 'M8 5v14M16 5v14' },
  play: { stroke: 'M7 4.5v15L19 12z' },
  trash: { stroke: 'M4 7h16M10 3.5h4M6 7l1 13h10l1-13M10 11v6M14 11v6' },
  pencil: { stroke: 'M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19zM14.5 6.5l3 3' },
  share: { stroke: 'M12 15V3.5M8 7l4-4 4 4M6 11H5a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 5 21h14a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 19 11h-1' },
  repeat: { stroke: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4' },
  person: { stroke: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0' },
  calendar: { stroke: 'M6 4.5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3zM3 9.5h18M8 3v3M16 3v3' },
  close: { stroke: 'M6 6l12 12M18 6L6 18' },
  info: { stroke: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01' },
  receipt: { stroke: 'M6 3h12v18l-2.5-1.5L13 21l-2-1.5L9 21l-2.5-1.5L4.5 21V4.5A1.5 1.5 0 0 1 6 3zM8.5 8h7M8.5 12h7M8.5 16h4' },
  lock: { stroke: 'M6 11h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 6 11zM8 11V8a4 4 0 0 1 8 0v3' },
  more: { stroke: 'M4.5 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0M17.5 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0' },
  'chevron-left': { stroke: 'M15 5l-7 7 7 7' },
  cart: { stroke: 'M3 4h2.5l2.2 11.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2M9.5 20.5h.01M16.5 20.5h.01' },
  checklist: { stroke: 'M4 6.5l1.5 1.5L8 5M4 13l1.5 1.5L8 11.5M4 19.5L5.5 21 8 18M11.5 7h8.5M11.5 13.5H20M11.5 20H20' },
  qr: { stroke: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM19 14h1M14 19.5h.01M17.5 18v2.5M20 18v.01' },
  link: { stroke: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' },
  search: { stroke: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4' },
};

interface IconProps {
  name: IconName;
  size?: number;
  /** Active variant: soft fill under the outline, so state is not colour alone. */
  filled?: boolean;
  className?: string;
}

/** Decorative by default (`aria-hidden`); give the surrounding button an aria-label. */
export function Icon({ name, size = 24, filled = false, className }: IconProps): ReactNode {
  const shape = SHAPES[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {shape.fill && <path d={shape.fill} fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.2 : undefined} />}
      <path d={shape.stroke} />
    </svg>
  );
}
