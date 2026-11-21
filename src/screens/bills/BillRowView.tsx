import type { BillRow } from '../../lib/bills.ts';
import { CADENCE_UNIT } from '../../lib/bills.ts';
import { formatShortDate, relativeDueLabel } from '../../lib/format.ts';
import type { BillCategory } from '../../types.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useMoney } from '../../app/StoreProvider.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ListRow, type SwipeAction } from '../../components/ListRow.tsx';
import { Money } from '../../components/Money.tsx';
import { StatusPill } from '../../components/Chips.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { useBillActions } from './useBillActions.ts';

export const CATEGORY_LABEL: Record<BillCategory, string> = {
  subscriptions: 'Subscriptions',
  utilities: 'Utilities',
  'rent-mortgage': 'Rent/Mortgage',
  insurance: 'Insurance',
  other: 'Other',
};

export type RowKind = 'due-soon' | 'all' | 'paused' | 'ended' | 'today';

const TEST_ID_PREFIX: Record<RowKind, string> = {
  'due-soon': 'due-soon-row',
  all: 'bill-row',
  paused: 'bill-row',
  ended: 'bill-row',
  today: 'today-bill',
};

interface BillRowViewProps {
  row: BillRow;
  kind: RowKind;
  /** Swipe actions; off where the row is a plain shortcut (Today). */
  swipe?: boolean;
}

/**
 * One bill row (AC-BILL-3). Whole row opens the detail sheet; swipe left gives Pause/Resume and Delete
 * (the same actions live in the detail sheet, so swipe is never the only path).
 */
export function BillRowView({ row, kind, swipe = true }: BillRowViewProps) {
  const { bill, nextDue, daysUntil } = row;
  const { open } = useOverlays();
  const actions = useBillActions();
  const format = useMoney();
  const locale = deviceLocale();
  const shortDate = formatShortDate(nextDue, locale);
  const dueText = `${relativeDueLabel(daysUntil)} · ${shortDate}`;
  const unit = CADENCE_UNIT[bill.cadence];
  const isPaused = kind === 'paused';
  const isEnded = kind === 'ended';
  const category = bill.category ? CATEGORY_LABEL[bill.category] : null;

  let subtitle;
  if (isPaused) subtitle = <StatusPill tone="paused" icon="pause">Paused</StatusPill>;
  else if (isEnded) subtitle = bill.endDate ? `Ended ${formatShortDate(bill.endDate, locale)}` : 'Ended';
  else if (kind === 'due-soon' || kind === 'today' || row.daysUntil <= bill.leadDays) subtitle = <StatusPill tone="due-soon" icon="clock">{dueText}</StatusPill>;
  else subtitle = dueText;
  if (category && !isPaused && kind !== 'today') subtitle = <><span className="row__category">{category}</span>{subtitle}</>;

  const actionPrefix = kind === 'due-soon' ? 'due-soon' : 'bill';
  const swipeActions: SwipeAction[] = isEnded
    ? [{ key: 'delete', label: 'Delete', icon: 'trash', tone: 'delete', onAction: () => actions.remove(bill), testId: `${actionPrefix}-delete-${bill.id}` }]
    : [
        isPaused
          ? { key: 'resume', label: 'Resume', icon: 'play', tone: 'resume', onAction: () => actions.resume(bill), testId: `${actionPrefix}-resume-${bill.id}` }
          : { key: 'pause', label: 'Pause', icon: 'pause', tone: 'pause', onAction: () => actions.pause(bill), testId: `${actionPrefix}-pause-${bill.id}` },
        { key: 'delete', label: 'Delete', icon: 'trash', tone: 'delete', onAction: () => actions.remove(bill), testId: `${actionPrefix}-delete-${bill.id}` },
      ];

  const spoken = `${bill.name}, ${format(bill.amountMinor)} per ${unit}${isPaused ? ', paused' : isEnded ? ', ended' : `, due ${relativeDueLabel(daysUntil).toLowerCase()}, ${shortDate}`}`;

  return (
    <ListRow
      id={`${kind}-${bill.id}`}
      testId={`${TEST_ID_PREFIX[kind]}-${bill.id}`}
      onPress={() => open({ kind: 'bill-detail', billId: bill.id })}
      ariaLabel={spoken}
      leading={kind === 'today' ? <span className="row__icon"><Icon name="receipt" size={22} /></span> : undefined}
      title={bill.name}
      subtitle={subtitle}
      trailing={
        <span className="row__amount">
          <Money minor={bill.amountMinor} className="t-headline" />
          <span className="row__unit t-footnote">/ {unit}</span>
        </span>
      }
      muted={isPaused || isEnded}
      actions={swipe ? swipeActions : []}
    />
  );
}
