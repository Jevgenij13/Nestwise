import type { BillTotals } from '../../lib/bills.ts';
import { Money } from '../../components/Money.tsx';

interface TotalCardProps {
  totals: BillTotals;
  variant: 'today' | 'bills';
  /** Today: tapping opens Bills. */
  onPress?: () => void;
}

/** Monthly and yearly totals (AC-BILL-5, 6). Always shows 0.00 with no bills, never blank (AC-BILL-10). */
export function TotalCard({ totals, variant, onPress }: TotalCardProps) {
  const prefix = variant === 'today' ? 'today-' : '';
  const body = (
    <>
      <span className="t-subhead total__label">{variant === 'today' ? 'You pay about' : 'Monthly total'}</span>
      <span className="total__main">
        <Money minor={totals.monthlyMinor} hero testId={`${prefix}monthly-total`} />
        <span className="total__unit t-callout">{variant === 'today' ? 'a month' : '/ month'}</span>
      </span>
      <span className="total__year t-callout">
        <Money minor={totals.yearlyMinor} testId={`${prefix}yearly-total`} /> {variant === 'today' ? 'a year' : '/ year'}
      </span>
    </>
  );
  return onPress ? (
    <button type="button" className="card total pressable" onClick={onPress} data-testid={`${prefix}total-card`}>{body}</button>
  ) : (
    <div className="card total" data-testid={`${prefix}total-card`}>{body}</div>
  );
}
