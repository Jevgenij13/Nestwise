import { resolveCurrentMemberId } from '../../lib/household.ts';
import { useAppData } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Avatar } from '../../components/Avatar.tsx';
import { Icon } from '../../components/Icon.tsx';

/** "(A) Anna v": the current member; opens the "Who is using?" sheet (DESIGN 5.1, 5.6). Hidden until a household exists. */
export function MemberChip({ variant = 'chip' }: { variant?: 'chip' | 'row' }) {
  const { members, settings, household } = useAppData();
  const { open } = useOverlays();
  const id = resolveCurrentMemberId(members, settings.currentMemberId);
  const member = members.find((m) => m.id === id);
  if (!household || !member) return null;
  const row = variant === 'row';
  return (
    <button
      type="button"
      className={row ? 'member-row pressable' : 'member-chip pressable'}
      onClick={() => open({ kind: 'members', page: 'switch' })}
      aria-label={`Who is using? ${member.name}`}
      data-testid="member-chip"
    >
      <Avatar member={member} size={row ? 36 : 28} />
      <span className={row ? 't-headline member-row__name' : 'member-chip__name'} data-testid="member-chip-name">{member.name}</span>
      <Icon name="chevron-down" size={16} />
    </button>
  );
}
