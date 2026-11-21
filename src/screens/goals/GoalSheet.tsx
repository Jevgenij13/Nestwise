import { useEffect, useMemo, useState } from 'react';
import { billTotals } from '../../lib/bills.ts';
import { formatMonthYear } from '../../lib/dates.ts';
import { isLive, restore, softDelete, updateEntity } from '../../lib/entities.ts';
import {
  addToSavings, amountText, createGoal, editGoal, emptyGoalForm, evaluateGoalForm, formFromGoal, goalFieldsFromForm, monthsText, resetScenarios,
  targetDateBounds, unitOf, withAddedScenario, withMonthly, withoutScenario, withScenario, type GoalForm, type GoalMode, type GoalSaveError,
} from '../../lib/goalForm.ts';
import { MAX_GOALS } from '../../lib/limits.ts';
import { AMOUNT_ERROR_TEXT, parseAmount, type AmountError } from '../../lib/money.ts';
import { formatDuration, nextScenario, type RateError } from '../../lib/savings.ts';
import { copyText } from '../../app/files.ts';
import { deviceLocale } from '../../app/locale.ts';
import { useAppData, useCurrency, useMoney, useStore, useToday } from '../../app/StoreProvider.tsx';
import { useOverlays } from '../../app/overlays.tsx';
import { useToast } from '../../app/toast.tsx';
import { Button } from '../../components/Button.tsx';
import type { ChipOption } from '../../components/Chips.tsx';
import { TextField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Money } from '../../components/Money.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { ScenarioCards } from './ScenarioCards.tsx';

const MODES: ChipOption<GoalMode>[] = [
  { value: 'how-long', label: 'How long', testId: 'goal-mode-how-long' },
  { value: 'by-date', label: 'By a date', testId: 'goal-mode-by-date' },
];

const RATE_ERROR: Record<RateError, string> = {
  invalid: 'Enter a rate between 0 and 20',
  'out-of-range': 'Enter a rate between 0 and 20',
  'too-many-decimals': 'Use up to 2 decimals',
};

const DATE_ERROR = { 'invalid-date': 'Pick a date', 'not-future': 'Pick a date after today', 'too-far': 'Pick a date within 50 years', 'no-goal': 'Pick a date' } as const;

const SAVE_HINT: Record<GoalSaveError, string> = {
  'needs-goal': 'Enter what you want to save to save',
  invalid: 'Fix the highlighted fields to save',
  'no-scenario': 'Enter a monthly amount to save',
  'bad-scenario': 'Fix the monthly amounts to save',
  'by-date-needed': 'Pick a valid date to save',
};

const amountError = (code: AmountError | undefined): string | undefined => (code ? AMOUNT_ERROR_TEXT[code] : undefined);

/**
 * Savings calculator (DESIGN 5.7, AC-GOAL-1 to 9): inputs, live scenarios or the reverse "By a date" result.
 * Works unsaved (a quick calculation) or as a saved goal. All maths lives in lib/goalForm.ts and lib/savings.ts.
 */
export function GoalSheet({ goalId }: { goalId?: string }) {
  const store = useStore();
  const toast = useToast();
  const { goals, bills, settings } = useAppData();
  const today = useToday();
  const currency = useCurrency();
  const format = useMoney();
  const { close } = useOverlays();
  const locale = deviceLocale();
  const goal = goalId ? goals.find((g) => g.id === goalId && isLive(g)) : undefined;
  const editing = goal !== undefined;
  const unit = unitOf(currency);

  const initial = useMemo(() => (goal ? formFromGoal(goal, currency) : emptyGoalForm()),
    // Seeded once when the sheet opens; later store changes must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
  const [baseline, setBaseline] = useState<GoalForm>(initial);
  const [form, setForm] = useState<GoalForm>(initial);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [savingsInput, setSavingsInput] = useState('');
  const patch = (p: Partial<GoalForm>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (goalId && !goal) close();
  }, [goalId, goal, close]);

  const evaluation = useMemo(() => evaluateGoalForm(form, currency, today), [form, currency, today]);
  const saveFields = useMemo(() => goalFieldsFromForm(form, currency, today), [form, currency, today]);
  const liveCount = goals.filter(isLive).length;
  const atLimit = !editing && liveCount >= MAX_GOALS;
  const canSave = saveFields.ok && !atLimit;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const bounds = targetDateBounds(today);
  // Left after bills (AC-GOAL-10): shown only when an income is set in Settings.
  const leftMinor = settings.monthlyIncomeMinor === undefined ? null : settings.monthlyIncomeMinor - billTotals(bills, today).monthlyMinor;

  const save = () => {
    if (!saveFields.ok || atLimit) return;
    const fields = saveFields.value;
    store.update((d, c) => ({
      ...d,
      goals: goal ? d.goals.map((g) => (g.id === goal.id ? editGoal(g, fields, c.now) : g)) : [...d.goals, createGoal(fields, c.newId(), c.now)],
    }));
    close();
  };

  const remove = () => {
    if (!goal) return;
    store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? softDelete(g, c.now) : g)) }));
    toast.show({
      message: `${goal.name ?? 'Goal'} deleted`,
      actionLabel: 'Undo',
      onAction: () => store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? restore(g, c.now) : g)) })),
    });
    close();
  };

  // "Add to savings" adds to the stored amount (not replace) and shows the new total in the form.
  const added = parseAmount(savingsInput, currency);
  const newTotal = goal && added.ok ? addToSavings(goal.currentMinor, added.value) : null;
  const addSavings = () => {
    if (!goal || newTotal === null) return;
    const previous = goal.currentMinor;
    store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? updateEntity(g, { currentMinor: newTotal }, c.now) : g)) }));
    const show = (minor: number) => {
      const text = amountText(minor, currency);
      setForm((f) => ({ ...f, saved: text }));
      setBaseline((b) => ({ ...b, saved: text }));
    };
    show(newTotal);
    setSavingsInput('');
    setSavingsOpen(false);
    toast.show({
      message: `Added ${format(newTotal - previous)} to savings`,
      actionLabel: 'Undo',
      onAction: () => {
        store.update((d, c) => ({ ...d, goals: d.goals.map((g) => (g.id === goal.id ? updateEntity(g, { currentMinor: previous }, c.now) : g)) }));
        show(previous);
      },
    });
  };

  const shareResult = async () => {
    const lines = [`${form.name.trim() || 'Savings goal'}: ${format(evaluation.input?.goalMinor ?? 0)}`, `Saved so far: ${format(evaluation.input?.savedMinor ?? 0)}`];
    if (evaluation.status === 'reached') lines.push('Goal already reached');
    else if (form.mode === 'by-date' && evaluation.required?.kind === 'ok' && evaluation.required.value.kind === 'ok' && form.targetDate) {
      lines.push(`Put aside ${format(evaluation.required.value.monthlyMinor)} a month for ${evaluation.required.value.months} months to reach it by ${formatMonthYear(form.targetDate, locale)}`);
    } else {
      for (const s of evaluation.scenarios) {
        if (s.result?.result.kind === 'ok') lines.push(`${format(s.result.monthlyMinor)} a month: ${monthsText(s.result.result.months)} (${formatDuration(s.result.result.months)}), ${formatMonthYear(s.result.targetDate ?? today, locale)}`);
      }
    }
    lines.push('Estimates only. Not financial advice.');
    const text = lines.join('\n');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    if (await copyText(text)) toast.show({ message: 'Result copied' });
  };

  const rateError = evaluation.rateError ? RATE_ERROR[evaluation.rateError] : undefined;
  const dateError = form.mode === 'by-date' && evaluation.required?.kind === 'error' ? DATE_ERROR[evaluation.required.error] : undefined;
  const hint = atLimit ? `You can keep up to ${MAX_GOALS} goals` : !saveFields.ok ? SAVE_HINT[saveFields.error] : '';
  const required = evaluation.required;

  return (
    <Sheet
      title="Goal"
      closeLabel="Close"
      dirty={dirty}
      onClose={close}
      testId="goal-sheet"
      headerAction={
        <button type="button" className="sheet__side-btn tap-target pressable" onClick={save} disabled={!canSave} aria-disabled={!canSave} data-testid="goal-save-button">
          Save
        </button>
      }
    >
      <div className="form" data-testid="goal-form">
        <TextField label="Goal name (optional)" value={form.name} onChange={(name) => patch({ name })} maxLength={60} autoComplete="off" autoCapitalize="sentences" enterKeyHint="next" testId="goal-name-input" />
        <TextField label="What you want to save" value={form.goal} onChange={(goalText) => patch({ goal: goalText })} error={amountError(evaluation.goalError)} prefix={currency} inputMode="decimal" autoComplete="off" testId="goal-target-input" />
        <TextField label="Saved so far" value={form.saved} onChange={(saved) => patch({ saved })} error={amountError(evaluation.savedError)} prefix={currency} inputMode="decimal" autoComplete="off" placeholder="0" testId="goal-saved-input" />
        {editing && (
          <div className="savings-add">
            <button type="button" className="disclosure tap-target" aria-expanded={savingsOpen} onClick={() => setSavingsOpen(!savingsOpen)} data-testid="goal-add-savings-toggle">
              <Icon name="plus" size={18} />
              Add to savings
            </button>
            {savingsOpen && (
              <div className="card savings-add__panel" data-testid="goal-add-savings">
                <TextField
                  label="How much did you add?"
                  value={savingsInput}
                  onChange={setSavingsInput}
                  prefix={currency}
                  inputMode="decimal"
                  autoComplete="off"
                  hint={newTotal !== null ? <span data-testid="goal-add-savings-preview" data-minor={newTotal}>New total {format(newTotal)}</span> : undefined}
                  testId="goal-add-savings-input"
                />
                <Button block disabled={newTotal === null} onClick={addSavings} data-testid="goal-add-savings-button">Add</Button>
              </div>
            )}
          </div>
        )}
        <TextField label="Interest per year (%)" value={form.rate} onChange={(rate) => patch({ rate })} error={rateError} inputMode="decimal" autoComplete="off" placeholder="0" testId="goal-rate-input" />

        <Segmented label="Calculation" options={MODES} value={form.mode} onChange={(mode) => patch({ mode })} testId="goal-mode" />

        {form.mode === 'how-long' ? (
          <>
            <TextField label="Monthly amount" value={form.monthly} onChange={(monthly) => setForm((f) => withMonthly(f, monthly, currency))} prefix={currency} inputMode="decimal" autoComplete="off" hint={form.scenariosEdited ? 'Used as the base when you reset the scenarios.' : undefined} testId="goal-monthly-input" />
            {leftMinor !== null && (
              <p className="t-footnote" data-testid="goal-left-after-bills">
                Left after bills: <Money minor={leftMinor} testId="goal-left-after-bills-amount" />.{' '}
                {leftMinor > 0 && (
                  <button type="button" className="link" onClick={() => setForm((f) => withMonthly(f, amountText(leftMinor, currency), currency))} data-testid="goal-use-left">Use as monthly amount</button>
                )}
              </p>
            )}
            {form.scenariosEdited && (
              <button type="button" className="disclosure tap-target" onClick={() => setForm((f) => resetScenarios(f, currency))} data-testid="goal-reset-scenarios">Reset scenarios</button>
            )}
          </>
        ) : (
          <TextField
            label="Reach it by"
            type="date"
            value={form.targetDate}
            onChange={(targetDate) => patch({ targetDate })}
            min={bounds.min}
            max={bounds.max}
            error={dateError}
            testId="goal-date-input"
          />
        )}

        <section aria-live="polite" data-testid="goal-results">
          {evaluation.status === 'needs-goal' && <p className="note t-subhead" data-testid="goal-hint">Enter what you want to save to see results.</p>}
          {evaluation.status === 'reached' && (
            <div className="result result--success card" data-testid="goal-reached">
              <Icon name="check" size={24} />
              <span className="t-title-3">Goal already reached</span>
            </div>
          )}
          {evaluation.status === 'ready' && form.mode === 'how-long' && (
            form.scenarios.length === 0 ? (
              <p className="note t-subhead" data-testid="goal-monthly-prompt">Enter a monthly amount</p>
            ) : (
              <ScenarioCards
                texts={form.scenarios}
                scenarios={evaluation.scenarios}
                fastest={evaluation.fastest}
                onChange={(i, text) => setForm((f) => withScenario(f, i, text))}
                onRemove={(i) => setForm((f) => withoutScenario(f, i))}
                onAdd={() => setForm((f) => withAddedScenario(f, nextScenario(evaluation.scenarios.flatMap((s) => (s.amountMinor === null ? [] : [s.amountMinor])), unit), currency))}
              />
            )
          )}
          {evaluation.status === 'ready' && form.mode === 'by-date' && (
            <>
              {required?.kind === 'empty' && <p className="note t-subhead" data-testid="goal-date-prompt">Pick a date to see the monthly amount.</p>}
              {required?.kind === 'ok' && required.value.kind === 'ok' && (
                <div className="result card" data-testid="goal-required">
                  <span className="t-subhead">Put aside each month</span>
                  <Money minor={required.value.monthlyMinor} hero testId="goal-required-amount" />
                  <span className="t-callout" data-testid="goal-required-months" data-months={required.value.months}>for {monthsText(required.value.months)}</span>
                  <span className="t-callout">You add <Money minor={required.value.monthlyMinor * required.value.months} testId="goal-required-total" /> in total</span>
                  <span className="t-footnote" data-testid="goal-required-note">Rounded up so you reach your goal.</span>
                </div>
              )}
              {required?.kind === 'ok' && required.value.kind === 'covered-by-interest' && (
                <div className="result result--success card" data-testid="goal-covered">
                  <Icon name="check" size={24} />
                  <span className="t-headline">Your savings and interest already reach it</span>
                  <span className="t-callout">You do not need to add anything to get there by {form.targetDate ? formatMonthYear(form.targetDate, locale) : 'then'}.</span>
                </div>
              )}
            </>
          )}
        </section>

        {hint && <p className="t-footnote" data-testid="goal-save-hint">{hint}</p>}
        {evaluation.status !== 'needs-goal' && evaluation.status !== 'invalid' && (
          <Button variant="secondary" block onClick={() => void shareResult()} data-testid="goal-share-button">
            <Icon name="share" size={20} />
            Share result
          </Button>
        )}
        <p className="t-footnote" data-testid="goal-disclaimer">Estimates only. Not financial advice.</p>

        {editing && (
          <div className="form__danger">
            <Button variant="text" className="btn--danger-text" block onClick={remove} data-testid="goal-delete-button">Delete goal</Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
