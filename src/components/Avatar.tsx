import type { Member } from '../types.ts';
import { Icon } from './Icon.tsx';

interface AvatarProps {
  /** A member, or null for "Anyone" (outlined circle with a person icon, DESIGN 4.4). */
  member: Pick<Member, 'name' | 'colour'> | null;
  size?: number;
  testId?: string;
}

/** Coloured circle with the member's initial; initials always show so colour is never the only cue. */
export function Avatar({ member, size = 28, testId }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.46) };
  if (!member) {
    return (
      <span className="avatar avatar--anyone" style={style} data-testid={testId} title="Anyone">
        <Icon name="person" size={Math.round(size * 0.64)} />
      </span>
    );
  }
  return (
    <span className="avatar" style={{ ...style, background: member.colour }} data-testid={testId} aria-hidden="true">
      {initialOf(member.name)}
    </span>
  );
}

export function initialOf(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}
