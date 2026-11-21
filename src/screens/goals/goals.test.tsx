import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeBill, makeData, makeGoal } from '../../lib/test-fixtures.ts';
import { onboarded } from '../../test/home-data.ts';
import { renderApp } from '../../test/render.tsx';
import type { Goal } from '../../types.ts';

const empty = () => onboarded(makeData());
const withGoals = (goals: Goal[]) => onboarded(makeData({ goals }));
const text = (id: string) => screen.getByTestId(id).textContent;
const months = (i: number) => Number(screen.getByTestId(`goal-scenario-months-${i}`).dataset.months);

async function fill(user: ReturnType<typeof renderApp>['user'], values: { goal?: string; saved?: string; monthly?: string; rate?: string }) {
  if (values.goal !== undefined) await user.type(screen.getByTestId('goal-target-input'), values.goal);
  if (values.saved !== undefined) await user.type(screen.getByTestId('goal-saved-input'), values.saved);
  if (values.rate !== undefined) await user.type(screen.getByTestId('goal-rate-input'), values.rate);
  if (values.monthly !== undefined) await user.type(screen.getByTestId('goal-monthly-input'), values.monthly);
}

async function openCalculator(route = '/goals', data = empty()) {
  const view = renderApp({ route, data });
  await view.user.click(screen.getByTestId('goal-add-button'));
  return view;
}

describe('Goals empty state (AC-GOAL-9)', () => {
  it('shows an empty state with a primary action that opens the calculator', async () => {
    await openCalculator();
    expect(screen.getByTestId('goal-sheet')).toBeTruthy();
    expect(text('goal-disclaimer')).toBe('Estimates only. Not financial advice.');
  });

  it('the empty state explains what Goals does', () => {
    renderApp({ route: '/goals', data: empty() });
    expect(text('goals-empty')).toContain('No goals yet');
  });
});

describe('scenarios (AC-GOAL-1, 2, 3)', () => {
  it('one monthly amount generates 4 cards: 0.5x, 1x, 1.5x, 2x, live with no Calculate button', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000', monthly: '200' });
    expect([0, 1, 2, 3].map((i) => (screen.getByTestId(`goal-scenario-input-${i}`) as HTMLInputElement).value)).toEqual(['100', '200', '300', '400']);
    expect([0, 1, 2, 3].map(months)).toEqual([40, 20, 14, 10]);
    expect(screen.queryByText(/calculate/i)).toBeNull();
  });

  it('AC-GOAL-3: editing the cards to 100 / 200 / 250 / 400 gives 40 / 20 / 16 / 10 months, Mar 2030 / Jul 2028 / Mar 2028 / Sep 2027', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000', monthly: '200' });
    const third = screen.getByTestId('goal-scenario-input-2');
    await user.clear(third);
    await user.type(third, '250');
    expect([0, 1, 2, 3].map(months)).toEqual([40, 20, 16, 10]);
    expect([0, 1, 2, 3].map((i) => text(`goal-scenario-date-${i}`))).toEqual(['Mar 2030', 'Jul 2028', 'Mar 2028', 'Sep 2027']);
    expect([0, 1, 2, 3].map((i) => text(`goal-scenario-duration-${i}`))).toEqual(['3 yrs 4 mo', '1 yr 8 mo', '1 yr 4 mo', '10 mo']);
    expect(text('goal-scenario-fastest-3')).toBe('Fastest');
    expect(screen.queryByTestId('goal-scenario-fastest-0')).toBeNull();
  });

  it('regeneration rule: the monthly field drives the cards until one is edited by hand; Reset regenerates', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', monthly: '200' });
    expect(screen.queryByTestId('goal-reset-scenarios')).toBeNull();
    await user.clear(screen.getByTestId('goal-monthly-input'));
    await user.type(screen.getByTestId('goal-monthly-input'), '100');
    expect((screen.getByTestId('goal-scenario-input-3') as HTMLInputElement).value).toBe('200');

    const first = screen.getByTestId('goal-scenario-input-0');
    await user.clear(first);
    await user.type(first, '77');
    await user.clear(screen.getByTestId('goal-monthly-input'));
    await user.type(screen.getByTestId('goal-monthly-input'), '400');
    expect((screen.getByTestId('goal-scenario-input-0') as HTMLInputElement).value).toBe('77');
    expect((screen.getByTestId('goal-scenario-input-3') as HTMLInputElement).value).toBe('200');

    await user.click(screen.getByTestId('goal-reset-scenarios'));
    expect([0, 1, 2, 3].map((i) => (screen.getByTestId(`goal-scenario-input-${i}`) as HTMLInputElement).value)).toEqual(['200', '400', '600', '800']);
    expect(screen.queryByTestId('goal-reset-scenarios')).toBeNull();
  });

  it('scenarios can be removed down to 1 and added back up to 4', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', monthly: '200' });
    expect(screen.queryByTestId('goal-add-scenario')).toBeNull();
    await user.click(screen.getByTestId('goal-scenario-remove-3'));
    await user.click(screen.getByTestId('goal-scenario-remove-2'));
    await user.click(screen.getByTestId('goal-scenario-remove-1'));
    expect(screen.queryByTestId('goal-scenario-remove-0')).toBeNull(); // the last one stays
    await user.click(screen.getByTestId('goal-add-scenario'));
    await user.click(screen.getByTestId('goal-add-scenario'));
    await user.click(screen.getByTestId('goal-add-scenario'));
    expect(screen.getByTestId('goal-scenarios').children).toHaveLength(4);
    expect(screen.queryByTestId('goal-add-scenario')).toBeNull();
  });
});

describe('interest (AC-GOAL-4)', () => {
  it('5% gives 36 months at 100 a month and 19 at 200', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000', rate: '5', monthly: '100' });
    // Cards are 50 / 100 / 150 / 200.
    expect(months(1)).toBe(36);
    expect(months(3)).toBe(19);
  });

  it('rejects a rate outside 0 to 20 or with more than 2 decimals, inline, with no results', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', monthly: '100', rate: '25' });
    expect(text('goal-rate-input-error')).toBe('Enter a rate between 0 and 20');
    expect(screen.queryByTestId('goal-scenarios')).toBeNull();
    const rate = screen.getByTestId('goal-rate-input');
    await user.clear(rate);
    await user.type(rate, '1.234');
    expect(text('goal-rate-input-error')).toBe('Use up to 2 decimals');
    await user.clear(rate);
    await user.type(rate, '20');
    expect(screen.queryByTestId('goal-rate-input-error')).toBeNull();
    expect(screen.getByTestId('goal-scenarios')).toBeTruthy();
  });
});

describe('edge cases (AC-GOAL-5)', () => {
  it('goal empty or 0 shows only the hint; monthly empty or 0 shows a prompt, never Infinity', async () => {
    const { user } = await openCalculator();
    expect(text('goal-hint')).toBe('Enter what you want to save to see results.');
    await user.type(screen.getByTestId('goal-target-input'), '0');
    expect(screen.getByTestId('goal-hint')).toBeTruthy();
    expect(screen.queryByTestId('goal-target-input-error')).toBeNull();
    await user.clear(screen.getByTestId('goal-target-input'));
    await user.type(screen.getByTestId('goal-target-input'), '5000');
    expect(text('goal-monthly-prompt')).toBe('Enter a monthly amount');
    await user.type(screen.getByTestId('goal-monthly-input'), '0');
    expect(text('goal-monthly-prompt')).toBe('Enter a monthly amount');
    expect(document.body.textContent).not.toMatch(/Infinity|NaN/);
  });

  it('saved >= goal shows "Goal already reached" in both modes', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '5000', monthly: '100' });
    expect(text('goal-reached')).toBe('Goal already reached');
    expect(screen.queryByTestId('goal-scenarios')).toBeNull();
    await user.click(screen.getByTestId('goal-mode-by-date'));
    fireEvent.change(screen.getByTestId('goal-date-input'), { target: { value: '2027-11-21' } });
    expect(text('goal-reached')).toBe('Goal already reached');
    expect(screen.queryByTestId('goal-required')).toBeNull();
  });

  it('a scenario needing more than 1,200 months says "More than 100 years"', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', monthly: '1' });
    expect(text('goal-scenario-toolong-0')).toBe('More than 100 years');
    expect(screen.queryByTestId('goal-scenario-months-0')).toBeNull();
  });

  it('flags non-numeric amounts inline', async () => {
    const { user } = await openCalculator();
    await user.type(screen.getByTestId('goal-target-input'), 'abc');
    expect(screen.getByTestId('goal-target-input-error')).toBeTruthy();
    await user.type(screen.getByTestId('goal-saved-input'), '-5');
    expect(screen.getByTestId('goal-saved-input-error')).toBeTruthy();
    expect(screen.queryByTestId('goal-hint')).toBeNull();
  });
});

describe('By a date (AC-GOAL-6, 7)', () => {
  const pickDate = (value: string) => fireEvent.change(screen.getByTestId('goal-date-input'), { target: { value } });

  it('goal 5,000, saved 1,000, 12 months gives 333.34 a month (rounded up)', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000' });
    await user.click(screen.getByTestId('goal-mode-by-date'));
    expect(text('goal-date-prompt')).toBe('Pick a date to see the monthly amount.');
    pickDate('2027-11-21');
    expect(screen.getByTestId('goal-required-amount').dataset.minor).toBe('33334');
    expect(text('goal-required-amount')).toBe('€333.34');
    expect(screen.getByTestId('goal-required-months').dataset.months).toBe('12');
    expect(text('goal-required-total')).toBe('€4,000.08');
    expect(text('goal-required-note')).toBe('Rounded up so you reach your goal.');
  });

  it('a same-day or past date shows an inline error and no result; the picker is bounded', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000' });
    await user.click(screen.getByTestId('goal-mode-by-date'));
    const input = screen.getByTestId('goal-date-input') as HTMLInputElement;
    expect(input.min).toBe('2026-11-22');
    expect(input.max).toBe('2076-11-21');
    pickDate('2026-11-21');
    expect(text('goal-date-input-error')).toBe('Pick a date after today');
    expect(screen.queryByTestId('goal-required')).toBeNull();
    pickDate('2020-01-01');
    expect(text('goal-date-input-error')).toBe('Pick a date after today');
    pickDate('2080-01-01');
    expect(text('goal-date-input-error')).toBe('Pick a date within 50 years');
    pickDate('2027-11-21');
    expect(screen.queryByTestId('goal-date-input-error')).toBeNull();
    expect(screen.getByTestId('goal-required')).toBeTruthy();
  });

  it('says so when savings and interest already cover the goal by the date', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '1500', saved: '1000', rate: '10' });
    await user.click(screen.getByTestId('goal-mode-by-date'));
    pickDate('2036-11-21');
    expect(screen.getByTestId('goal-covered')).toBeTruthy();
    expect(screen.queryByTestId('goal-required')).toBeNull();
  });
});

describe('saved goals (AC-GOAL-9, 11)', () => {
  async function saveGoal(user: ReturnType<typeof renderApp>['user'], name = 'New laptop') {
    await user.type(screen.getByTestId('goal-name-input'), name);
    await fill(user, { goal: '5000', saved: '1000', monthly: '200' });
    await user.click(screen.getByTestId('goal-save-button'));
  }

  it('saves name, target, current, scenarios and rate, then lists it with progress and a summary', async () => {
    const { user, store } = await openCalculator();
    expect((screen.getByTestId('goal-save-button') as HTMLButtonElement).disabled).toBe(true);
    expect(text('goal-save-hint')).toBe('Enter what you want to save to save');
    await saveGoal(user);
    const [goal] = store.getState().data.goals;
    expect(goal).toMatchObject({ name: 'New laptop', targetMinor: 500000, currentMinor: 100000, scenariosMinor: [10000, 20000, 30000, 40000], annualRatePct: 0 });
    expect(goal).not.toHaveProperty('targetDate');
    expect(screen.queryByTestId('goal-sheet')).toBeNull();
    expect(text(`goal-progress-pct-${goal!.id}`)).toBe('20%');
    expect(text(`goal-progress-text-${goal!.id}`)).toBe('€1,000.00 of €5,000.00');
    expect(screen.getByTestId(`goal-progress-${goal!.id}`).getAttribute('aria-valuenow')).toBe('20');
    expect(text(`goal-summary-${goal!.id}`)).toBe('40 months at €100.00 / month. Ready by Mar 2030');
  });

  it('reopens a saved goal filled in, keeps hand-edited scenarios, and editing overwrites the goal', async () => {
    const goal = makeGoal('g1', { name: 'Holiday', scenariosMinor: [10000, 20000, 25000, 40000] });
    const { user, store } = renderApp({ route: '/goals', data: withGoals([goal]) });
    await user.click(screen.getByTestId('goal-row-g1').querySelector('.row__main') as HTMLElement);
    expect((screen.getByTestId('goal-name-input') as HTMLInputElement).value).toBe('Holiday');
    expect((screen.getByTestId('goal-target-input') as HTMLInputElement).value).toBe('5000');
    expect((screen.getByTestId('goal-scenario-input-2') as HTMLInputElement).value).toBe('250');
    expect(screen.getByTestId('goal-reset-scenarios')).toBeTruthy();
    await user.type(screen.getByTestId('goal-rate-input'), '5');
    await user.click(screen.getByTestId('goal-save-button'));
    expect(store.getState().data.goals).toHaveLength(1);
    expect(store.getState().data.goals[0]).toMatchObject({ id: 'g1', annualRatePct: 5, scenariosMinor: [10000, 20000, 25000, 40000] });
  });

  it('saves a by-date goal with its date and the list shows the monthly amount needed', async () => {
    const { user, store } = await openCalculator();
    await fill(user, { goal: '5000', saved: '1000' });
    await user.click(screen.getByTestId('goal-mode-by-date'));
    fireEvent.change(screen.getByTestId('goal-date-input'), { target: { value: '2027-11-21' } });
    await user.click(screen.getByTestId('goal-save-button'));
    const [goal] = store.getState().data.goals;
    expect(goal).toMatchObject({ targetDate: '2027-11-21' });
    expect(goal).not.toHaveProperty('name');
    expect(text(`goal-summary-${goal!.id}`)).toBe('Put aside €333.34 / month to reach it by Nov 2027');
    expect(screen.getByTestId(`goal-row-${goal!.id}`).textContent).toContain('Goal');
  });

  it('"Add to savings" adds to the stored amount with a live preview and an Undo', async () => {
    const goal = makeGoal('g1', { name: 'Holiday' });
    const { user, store } = renderApp({ route: '/goals', data: withGoals([goal]) });
    await user.click(screen.getByTestId('goal-row-g1').querySelector('.row__main') as HTMLElement);
    await user.click(screen.getByTestId('goal-add-savings-toggle'));
    expect((screen.getByTestId('goal-add-savings-button') as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByTestId('goal-add-savings-input'), '200,50');
    expect(screen.getByTestId('goal-add-savings-preview').dataset.minor).toBe('120050');
    expect(text('goal-add-savings-preview')).toBe('New total €1,200.50');
    await user.click(screen.getByTestId('goal-add-savings-button'));
    expect(store.getState().data.goals[0]?.currentMinor).toBe(120050);
    expect((screen.getByTestId('goal-saved-input') as HTMLInputElement).value).toBe('1200.50');
    expect(screen.getByTestId('toast-message').textContent).toBe('Added €200.50 to savings');
    await user.click(screen.getByTestId('toast-action'));
    expect(store.getState().data.goals[0]?.currentMinor).toBe(100000);
    expect((screen.getByTestId('goal-saved-input') as HTMLInputElement).value).toBe('1000');
  });

  it('deleting has a 5 second Undo', async () => {
    const { user, store } = renderApp({ route: '/goals', data: withGoals([makeGoal('g1', { name: 'Holiday' })]) });
    await user.click(screen.getByTestId('goal-row-g1').querySelector('.row__main') as HTMLElement);
    await user.click(screen.getByTestId('goal-delete-button'));
    expect(store.getState().data.goals[0]?.deletedAt).not.toBeNull();
    expect(screen.getByTestId('goals-empty')).toBeTruthy();
    await user.click(screen.getByTestId('toast-action'));
    expect(store.getState().data.goals[0]?.deletedAt).toBeNull();
    expect(screen.getByTestId('goal-row-g1')).toBeTruthy();
  });

  it('allows up to 20 goals', async () => {
    const goals = Array.from({ length: 20 }, (_, i) => makeGoal(`g${i}`));
    const { user } = renderApp({ route: '/goals', data: withGoals(goals) });
    await user.click(screen.getByTestId('goal-add-button'));
    await fill(user, { goal: '5000', monthly: '200' });
    expect((screen.getByTestId('goal-save-button') as HTMLButtonElement).disabled).toBe(true);
    expect(text('goal-save-hint')).toBe('You can keep up to 20 goals');
    // A quick unsaved calculation still works.
    expect(months(1)).toBe(25);
  });

  it('asks before discarding an unsaved calculation', async () => {
    const { user } = await openCalculator();
    await fill(user, { goal: '5000' });
    await user.click(screen.getByTestId('goal-sheet-close'));
    expect(screen.getByTestId('discard-dialog')).toBeTruthy();
    await user.click(screen.getByTestId('discard-dialog-confirm'));
    expect(screen.queryByTestId('goal-sheet')).toBeNull();
  });

  it('formats money in the default currency with the device locale and 0-decimal currencies stay whole (AC-GOAL-8)', async () => {
    const data = empty();
    data.settings.currency = 'JPY';
    const { user } = await openCalculator('/goals', data);
    await fill(user, { goal: '100000', monthly: '10000' });
    expect([0, 1, 2, 3].map(months)).toEqual([20, 10, 7, 5]);
    await user.click(screen.getByTestId('goal-mode-by-date'));
    fireEvent.change(screen.getByTestId('goal-date-input'), { target: { value: '2027-11-21' } });
    expect(text('goal-required-amount')).toBe('¥8,334');
  });
});

describe('Left after bills (AC-GOAL-10)', () => {
  const bills = [
    makeBill('w', { amountMinor: 1000, cadence: 'weekly' }),
    makeBill('b', { amountMinor: 2500, cadence: 'biweekly' }),
    makeBill('q', { amountMinor: 3000, cadence: 'quarterly' }),
    makeBill('y', { amountMinor: 12000, cadence: 'yearly' }),
    makeBill('m', { amountMinor: 999 }),
  ];
  const withIncome = (income?: number) => {
    const data = onboarded(makeData({ bills }));
    if (income !== undefined) data.settings.monthlyIncomeMinor = income;
    return data;
  };

  it('income 2,000 and bills 127.49 shows 1,872.51 and offers it as the monthly amount', async () => {
    const { user } = await openCalculator('/goals', withIncome(200000));
    await fill(user, { goal: '5000' });
    expect(screen.getByTestId('goal-left-after-bills-amount').dataset.minor).toBe('187251');
    expect(text('goal-left-after-bills-amount')).toBe('€1,872.51');
    await user.click(screen.getByTestId('goal-use-left'));
    expect((screen.getByTestId('goal-monthly-input') as HTMLInputElement).value).toBe('1872.51');
    expect(screen.getByTestId('goal-scenarios').children).toHaveLength(4);
  });

  it('is hidden when no income is set, and the income is set from Settings', async () => {
    const { user, store } = await openCalculator('/goals', withIncome());
    expect(screen.queryByTestId('goal-left-after-bills')).toBeNull();
    await user.click(screen.getByTestId('goal-sheet-close'));
    await user.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-income-row-value').textContent).toBe('Not set');
    await user.click(screen.getByTestId('settings-income-row'));
    await user.type(screen.getByTestId('income-input'), 'abc');
    expect(screen.getByTestId('income-input-error')).toBeTruthy();
    await user.clear(screen.getByTestId('income-input'));
    await user.type(screen.getByTestId('income-input'), '2000');
    await user.click(screen.getByTestId('income-save-button'));
    expect(store.getState().data.settings.monthlyIncomeMinor).toBe(200000);
    expect(screen.getByTestId('settings-income-row-value').textContent).toBe('€2,000.00');
    await user.click(screen.getByTestId('settings-income-row'));
    await user.clear(screen.getByTestId('income-input'));
    await user.click(screen.getByTestId('income-save-button'));
    expect(store.getState().data.settings).not.toHaveProperty('monthlyIncomeMinor');
  });
});
