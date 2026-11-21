import { useMemo } from 'react';
import type { Goal } from '../../types.ts';
import { isLive, restore, softDelete } from '../../lib/entities.ts';
import { formatMonthYear } from '../../lib/dates.ts';
import { goalProgressPct, summarizeGoal, monthsText } from '../../lib/goalForm.ts';
import { MAX_GOALS } from '../../lib/limits.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useAppData, useMoney, useStore, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { Group } from '../../components/Group.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ListRow } from '../../components/ListRow.tsx';
import { Screen } from '../../components/Screen.tsx';

/** Goals tab (DESIGN 5.7): saved goals with progress and a one-line result; New goal opens the calculator. */
export function GoalsScreen() {
  const { goals } = useAppData();
  const { open } = useOverlays();
  const today = useToday();
  const store = useStore();
  const toast = useToast();
  const format = useMoney();
  const locale = deviceLocale();
  const live = useMemo(() => goals.filter(isLive).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [goals]);

  const remove = (goal: Goal) => {
    store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? softDelete(g, c.now) : g)) }));
    toast.show({
      message: `${goal.name ?? 'Goal'} deleted`,
      actionLabel: 'Undo',
      onAction: () => store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? restore(g, c.now) : g)) })),
    });
  };

  const summaryText = (goal: Goal): string => {
    const s = summarizeGoal(goal, today);
    switch (s.kind) {
      case 'reached':
        return 'Goal already reached';
      case 'months':
        return `${monthsText(s.months)} at ${format(s.monthlyMinor)} / month. Ready by ${formatMonthYear(s.date, locale)}`;
      case 'too-long':
        return `More than 100 years at ${format(s.monthlyMinor)} / month`;
      case 'by-date':
        return `Put aside ${format(s.monthlyMinor)} / month to reach it by ${formatMonthYear(s.date, locale)}`;
      case 'covered':
        return `Already on track for ${formatMonthYear(s.date, locale)}`;
    }
  };

  const newGoal = () => open({ kind: 'goal' });
  const fab = live.length > 0 ? (
    <button type="button" className="fab pressable" onClick={newGoal} data-testid="goal-add-button">
      <Icon name="plus" size={22} />
      New goal
    </button>
  ) : undefined;

  return (
    <Screen title="Goals" testId="screen-goals" fab={fab}>
      {live.length === 0 ? (
        <EmptyState
          icon="goals"
          title="No goals yet"
          body="Work out how long it takes to save for something, or how much to put aside each month."
          testId="goals-empty"
          action={<Button onClick={newGoal} data-testid="goal-add-button">Plan your first goal</Button>}
        />
      ) : (
        <Group title={`Saved goals · ${live.length} of ${MAX_GOALS}`} testId="goals-list">
          {live.map((goal) => {
            const pct = goalProgressPct(goal);
            return (
              <ListRow
                key={goal.id}
                id={`goal-${goal.id}`}
                testId={`goal-row-${goal.id}`}
                onPress={() => open({ kind: 'goal', goalId: goal.id })}
                ariaLabel={`${goal.name ?? 'Goal'}, ${format(goal.currentMinor)} of ${format(goal.targetMinor)}, ${pct} percent. ${summaryText(goal)}`}
                title={goal.name ?? 'Goal'}
                subtitle={
                  <span className="goalcard">
                    <span className="goalcard__amounts t-subhead">
                      <span data-testid={`goal-progress-text-${goal.id}`}>{format(goal.currentMinor)} of {format(goal.targetMinor)}</span>
                      <span className="goalcard__pct num" data-testid={`goal-progress-pct-${goal.id}`}>{pct}%</span>
                    </span>
                    <span className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Saved so far" data-testid={`goal-progress-${goal.id}`}>
                      <span className="progress__fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="goalcard__summary t-subhead" data-testid={`goal-summary-${goal.id}`}>{summaryText(goal)}</span>
                  </span>
                }
                trailing={<Icon name="chevron-right" size={18} />}
                actions={[{ key: 'delete', label: 'Delete', icon: 'trash', tone: 'delete', onAction: () => remove(goal), testId: `goal-delete-${goal.id}` }]}
              />
            );
          })}
        </Group>
      )}
    </Screen>
  );
}
