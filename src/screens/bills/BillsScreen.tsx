import { useMemo, useState } from 'react';
import { billTotals, dueSoonBills, groupBills } from '../../lib/bills.ts';
import { isLive } from '../../lib/entities.ts';
import { useAppData, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { Group } from '../../components/Group.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Screen } from '../../components/Screen.tsx';
import { BillRowView } from './BillRowView.tsx';
import { TotalCard } from './TotalCard.tsx';

const PAUSED_COLLAPSE_OVER = 3;

/** Bills tab (DESIGN 5.2): totals, Due soon, All bills by next due, Paused and Ended groups, search (P1). */
export function BillsScreen() {
  const { bills } = useAppData();
  const today = useToday();
  const { open } = useOverlays();
  const [query, setQuery] = useState('');
  const [pausedExpanded, setPausedExpanded] = useState<boolean | null>(null);

  const view = useMemo(() => {
    const groups = groupBills(bills, today);
    const totals = billTotals(bills, today);
    const dueSoon = dueSoonBills(bills, today);
    return { groups, totals, dueSoon, any: bills.some(isLive) };
  }, [bills, today]);

  const needle = query.trim().toLowerCase();
  const matches = <T extends { bill: { name: string } }>(rows: T[]) => (needle ? rows.filter((r) => r.bill.name.toLowerCase().includes(needle)) : rows);
  const active = matches(view.groups.active);
  const paused = matches(view.groups.paused);
  const ended = matches(view.groups.ended);
  const dueSoon = matches(view.dueSoon);
  const nothingMatches = needle !== '' && active.length + paused.length + ended.length === 0;
  const pausedOpen = pausedExpanded ?? view.groups.paused.length <= PAUSED_COLLAPSE_OVER;
  const addBill = () => open({ kind: 'bill-form' });

  const fab = view.any ? (
    <button type="button" className="fab pressable" onClick={addBill} data-testid="bill-add-button">
      <Icon name="plus" size={22} />
      Add bill
    </button>
  ) : undefined;

  return (
    <Screen title="Bills" testId="screen-bills" fab={fab}>
      <TotalCard totals={view.totals} variant="bills" />
      <p className="note t-footnote" data-testid="rounding-note">
        <Icon name="info" size={16} />
        Rows are rounded; the total is calculated before rounding.
      </p>

      {!view.any ? (
        <EmptyState
          icon="bills"
          title="No bills yet"
          body="Add subscriptions and bills to see what you pay each month."
          testId="bills-empty"
          action={<Button onClick={addBill} data-testid="bill-add-button">Add your first bill</Button>}
        />
      ) : (
        <>
          <div className="search input">
            <Icon name="search" size={20} />
            <input
              type="search"
              className="input__control"
              placeholder="Search bills"
              aria-label="Search bills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
              data-testid="bill-search"
            />
          </div>

          {nothingMatches && <p className="note t-subhead" data-testid="bills-no-match">No bills match “{query.trim()}”</p>}

          {dueSoon.length > 0 && (
            <Group title="Due soon" testId="bills-due-soon">
              {dueSoon.map((row) => <BillRowView key={row.bill.id} row={row} kind="due-soon" />)}
            </Group>
          )}

          {!nothingMatches && active.length === 0 && paused.length > 0 && needle === '' && (
            <p className="note t-subhead" data-testid="bills-all-paused">All your bills are paused.</p>
          )}
          {active.length > 0 && (
            <Group title={`All bills · ${active.length}`} testId="bills-all">
              {active.map((row) => <BillRowView key={row.bill.id} row={row} kind="all" />)}
            </Group>
          )}

          {paused.length > 0 && (
            <Group title={`Paused · ${paused.length}`} testId="bills-paused" collapsible={{ open: needle !== '' || pausedOpen, onToggle: () => setPausedExpanded(!pausedOpen) }}>
              {paused.map((row) => <BillRowView key={row.bill.id} row={row} kind="paused" />)}
            </Group>
          )}

          {ended.length > 0 && (
            <Group title={`Ended · ${ended.length}`} testId="bills-ended">
              {ended.map((row) => <BillRowView key={row.bill.id} row={row} kind="ended" />)}
            </Group>
          )}
        </>
      )}
    </Screen>
  );
}
