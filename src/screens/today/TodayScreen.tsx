import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billTotals, dueSoonBills, nextUpcomingBill } from '../../lib/bills.ts';
import { isLive } from '../../lib/entities.ts';
import { choreDaysUntil, choreDueText, dueSoonChores, resolveCurrentMemberId } from '../../lib/household.ts';
import { daysAgoText, formatLongDate, formatShortDate } from '../../lib/format.ts';
import { backupNudge } from '../../app/nudge.ts';
import { deviceLocale } from '../../app/locale.ts';
import { loadPrefs, savePrefs } from '../../app/prefs.ts';
import { useAppData, useAppState, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Banner } from '../../components/Banner.tsx';
import { Button } from '../../components/Button.tsx';
import { StatusPill } from '../../components/Chips.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { Group } from '../../components/Group.tsx';
import { ListRow } from '../../components/ListRow.tsx';
import { Screen } from '../../components/Screen.tsx';
import { BillRowView } from '../bills/BillRowView.tsx';
import { TotalCard } from '../bills/TotalCard.tsx';
import { MemberChip } from '../home/MemberChip.tsx';
import { useItemActions } from '../home/useItemActions.ts';

/** Today (DESIGN 5.1): monthly total, Due soon bills, the current member's chores, empty state, backup nudge. */
export function TodayScreen() {
  const data = useAppData();
  const today = useToday();
  const persist = useAppState((s) => s.persist);
  const itemActions = useItemActions();
  const navigate = useNavigate();
  const { open } = useOverlays();
  const locale = deviceLocale();
  const [nudgeDismissedAt, setNudgeDismissedAt] = useState(() => loadPrefs().backupNudgeDismissedAt);

  const memberId = resolveCurrentMemberId(data.members, data.settings.currentMemberId);
  const view = useMemo(() => {
    const totals = billTotals(data.bills, today);
    return {
      totals,
      dueSoon: dueSoonBills(data.bills, today),
      chores: dueSoonChores(data.items, data.lists, memberId, today),
      next: nextUpcomingBill(data.bills, today),
      anyBill: data.bills.some(isLive),
    };
  }, [data.bills, data.items, data.lists, memberId, today]);

  const nudge = backupNudge(data, persist, new Date(), nudgeDismissedAt);
  const addBill = () => {
    navigate('/bills');
    open({ kind: 'bill-form' });
  };

  const dismissNudge = () => {
    const at = new Date().toISOString();
    savePrefs({ backupNudgeDismissedAt: at });
    setNudgeDismissedAt(at);
  };

  const empty = view.dueSoon.length === 0 && view.chores.length === 0;

  return (
    <Screen title="Today" subtitle={formatLongDate(today, locale)} testId="screen-today" barAction={<MemberChip />}>
      <TotalCard totals={view.totals} variant="today" onPress={() => navigate('/bills')} />

      {view.dueSoon.length > 0 && (
        <Group title="Due soon" testId="today-due-soon">
          {view.dueSoon.map((row) => <BillRowView key={row.bill.id} row={row} kind="today" swipe={false} />)}
        </Group>
      )}

      {view.chores.length > 0 && (
        <Group title="Your chores" testId="today-chores">
          {view.chores.map((item) => {
            const days = choreDaysUntil(item, today);
            const overdue = days !== null && days < 0;
            return (
              <ListRow
                key={item.id}
                id={`chore-${item.id}`}
                testId={`today-chore-${item.id}`}
                onPress={() => open({ kind: 'item', itemId: item.id })}
                leading={
                  <button type="button" className="check tap-target" aria-label={`Mark ${item.title} done`} onClick={() => itemActions.complete(item)} data-testid={`today-chore-check-${item.id}`}>
                    <span className="check__box" />
                  </button>
                }
                title={item.title}
                subtitle={
                  overdue ? (
                    <StatusPill tone="overdue" icon="warning">{choreDueText(item, today)}</StatusPill>
                  ) : (
                    <StatusPill tone="due-soon" icon="clock">{choreDueText(item, today) ?? ''}{item.dueDate ? ` · ${formatShortDate(item.dueDate, locale)}` : ''}</StatusPill>
                  )
                }
              />
            );
          })}
        </Group>
      )}

      {empty && (
        <EmptyState
          icon="today"
          title="Nothing due soon"
          testId="today-empty"
          body={
            view.next
              ? `Your next bill is ${view.next.bill.name} on ${formatLongDate(view.next.nextDue, locale)}.`
              : 'No bills yet. Add one to see it here.'
          }
          action={!view.anyBill ? <Button onClick={addBill} data-testid="today-add-bill">Add a bill</Button> : undefined}
        />
      )}

      {nudge && (
        <Banner tone={nudge.atRisk ? 'warning' : 'info'} icon="info" testId="backup-nudge" onDismiss={dismissNudge}
          action={<Button variant="secondary" onClick={() => open({ kind: 'settings', page: 'backup' })} data-testid="backup-nudge-action">Back up now</Button>}>
          <strong className="t-headline">Back up your data</strong>
          <p className="t-subhead" data-testid="backup-nudge-text">
            {nudge.atRisk ? 'Your phone may clear Nestwise data when space is low. ' : ''}
            {nudge.daysSinceBackup === null ? 'You have not backed up yet.' : `Last backup was ${daysAgoText(nudge.daysSinceBackup)}.`}
          </p>
        </Banner>
      )}
    </Screen>
  );
}
