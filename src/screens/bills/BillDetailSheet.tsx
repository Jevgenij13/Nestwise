import { useEffect } from 'react';
import { CADENCE_UNIT, billState, nextDue } from '../../lib/bills.ts';
import { addMonths, daysBetween } from '../../lib/dates.ts';
import { formatDateWithYear, formatShortDate, leadSentence, relativeDueLabel } from '../../lib/format.ts';
import { MONTHLY_TWELFTHS, occurrencesInWindow } from '../../lib/recurrence.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useAppData, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Money } from '../../components/Money.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { CATEGORY_LABEL } from './BillRowView.tsx';
import { useBillActions } from './useBillActions.ts';

/** Bill detail (DESIGN 5.4): every swipe action also lives here (AC-BILL-7, 8), plus the next three payments. */
export function BillDetailSheet({ billId }: { billId: string }) {
  const { bills } = useAppData();
  const today = useToday();
  const { close, replace } = useOverlays();
  const actions = useBillActions();
  const bill = bills.find((b) => b.id === billId && b.deletedAt === null);
  const locale = deviceLocale();

  useEffect(() => {
    if (!bill) close();
  }, [bill, close]);
  if (!bill) return null;

  const state = billState(bill, today);
  const live = state === 'active';
  const next = nextDue(bill, today);
  const upcoming = live ? occurrencesInWindow(bill.anchorDate, bill.cadence, today, addMonths(today, 60), 3) : [];
  const unit = CADENCE_UNIT[bill.cadence];
  const yearlyMinor = bill.amountMinor * MONTHLY_TWELFTHS[bill.cadence];

  return (
    <Sheet
      title="Bill"
      closeLabel="Close"
      onClose={close}
      testId="bill-detail"
      headerAction={
        <button type="button" className="sheet__side-btn tap-target pressable" onClick={() => replace({ kind: 'bill-form', billId: bill.id })} data-testid="bill-edit-button">
          Edit
        </button>
      }
    >
      <div className="detail">
        <h3 className="t-title-1" data-testid="bill-detail-name">{bill.name}</h3>
        {bill.category && <p className="t-subhead" data-testid="bill-detail-category">{CATEGORY_LABEL[bill.category]}</p>}

        <p className="detail__amount">
          <Money minor={bill.amountMinor} hero testId="bill-detail-amount" /> <span className="t-callout">/ {unit}</span>
        </p>
        {bill.cadence !== 'yearly' && (
          <p className="t-callout detail__year">
            = <Money minor={yearlyMinor} testId="bill-detail-yearly" /> / year
          </p>
        )}

        {state === 'paused' && (
          <div className="banner banner--warning" data-testid="bill-detail-paused">
            <span className="banner__icon"><Icon name="pause" size={22} /></span>
            <div className="banner__body">Paused. Not counted in your total or reminders.</div>
          </div>
        )}
        {state === 'ended' && <p className="t-callout" data-testid="bill-detail-ended">Ended {bill.endDate ? formatDateWithYear(bill.endDate, locale) : ''}. Not counted in your total or reminders.</p>}

        <dl className="card facts">
          {live && (
            <>
              <div className="facts__row">
                <dt>Next payment</dt>
                <dd data-testid="bill-detail-next">{formatShortDate(next, locale)} ({relativeDueLabel(daysBetween(today, next)).replace(/^In /, 'in ')})</dd>
              </div>
              {upcoming.length > 1 && (
                <div className="facts__row">
                  <dt>Then</dt>
                  <dd data-testid="bill-detail-then">{upcoming.slice(1).map((d) => formatShortDate(d, locale)).join(', ')}</dd>
                </div>
              )}
            </>
          )}
          <div className="facts__row">
            <dt>Reminder</dt>
            <dd data-testid="bill-detail-lead">{leadSentence(bill.leadDays)}</dd>
          </div>
          {bill.anchorDate < today && (
            <div className="facts__row">
              <dt>Paying since</dt>
              <dd data-testid="bill-detail-since">{formatDateWithYear(bill.anchorDate, locale)}</dd>
            </div>
          )}
        </dl>

        {bill.note && <p className="detail__note t-callout" data-testid="bill-detail-note">{bill.note}</p>}

        <div className="form__danger">
          {state === 'paused' && (
            <Button block onClick={() => { actions.resume(bill); close(); }} data-testid="bill-resume-button">Resume bill</Button>
          )}
          {live && (
            <Button variant="secondary" block onClick={() => { actions.pause(bill); close(); }} data-testid="bill-pause-button">Pause bill</Button>
          )}
          <Button variant="text" className="btn--danger-text" block onClick={() => { actions.remove(bill); close(); }} data-testid="bill-delete-button">Delete bill</Button>
        </div>
      </div>
    </Sheet>
  );
}
