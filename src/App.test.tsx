import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from './lib/storage.ts';
import { CURRENT_SCHEMA_VERSION } from './lib/migrations.ts';
import { makeBill, makeData } from './lib/test-fixtures.ts';
import { renderApp } from './test/render.tsx';
import type { AppData } from './types.ts';

const onboarded = (data: AppData): AppData => ({ ...data, settings: { ...data.settings, onboardingDone: true, currency: 'EUR' } });
const seeded = (bills = [makeBill('b1', { name: 'Netflix', amountMinor: 999, anchorDate: '2026-11-24' })]) => onboarded(makeData({ bills }));
const rowButton = (testId: string) => screen.getByTestId(testId).querySelector('.row__main') as HTMLElement;
const minor = (id: string) => Number(screen.getByTestId(id).dataset.minor);

describe('first run and onboarding (AC-APP-1)', () => {
  it('shows onboarding with the currency preselected from the device locale, then the app', async () => {
    const { user, store, backend } = renderApp({ locales: ['da-DK'] });
    expect(screen.getByTestId('onboarding-page-1')).toBeTruthy();
    await user.click(screen.getByTestId('onboarding-next'));
    await user.click(screen.getByTestId('onboarding-next'));
    const select = screen.getByTestId('onboarding-currency-select') as HTMLSelectElement;
    expect(select.value).toBe('DKK');
    await user.click(screen.getByTestId('onboarding-start'));
    expect(screen.getByTestId('screen-today')).toBeTruthy();
    expect(store.getState().data.settings).toMatchObject({ currency: 'DKK', onboardingDone: true });
    expect(backend.map.has(STORAGE_KEY)).toBe(true);
  });

  it('Skip commits the preselected currency and finishes', async () => {
    const { user, store } = renderApp({ locales: ['en-GB'] });
    await user.click(screen.getByTestId('onboarding-skip'));
    expect(store.getState().data.settings).toMatchObject({ currency: 'GBP', onboardingDone: true });
    expect(screen.getByTestId('screen-today')).toBeTruthy();
  });
});

describe('Today (AC-APP-6, AC-BILL-9)', () => {
  it('shows 0 total and the no-bills empty state', () => {
    renderApp({ data: seeded([]) });
    expect(minor('today-monthly-total')).toBe(0);
    expect(screen.getByTestId('today-empty').textContent).toContain('No bills yet. Add one to see it here.');
  });

  it('lists bills inside their lead window: lead 3, due 24 Nov yes, 25 Nov no', () => {
    renderApp({ data: seeded([makeBill('in', { name: 'In', anchorDate: '2026-11-24' }), makeBill('out', { name: 'Out', anchorDate: '2026-11-25' })]) });
    expect(screen.getByTestId('today-bill-in')).toBeTruthy();
    expect(screen.queryByTestId('today-bill-out')).toBeNull();
  });

  it('says when the next bill is when nothing is due soon', () => {
    renderApp({ data: seeded([makeBill('far', { name: 'Gym', anchorDate: '2026-12-20' })]) });
    expect(screen.getByTestId('today-empty').textContent).toContain('Your next bill is Gym on');
  });

  it('shows the monthly and yearly totals from the PRD example (AC-BILL-5, 6)', () => {
    renderApp({
      route: '/bills',
      data: seeded([
        makeBill('w', { amountMinor: 1000, cadence: 'weekly' }),
        makeBill('b', { amountMinor: 2500, cadence: 'biweekly' }),
        makeBill('q', { amountMinor: 3000, cadence: 'quarterly' }),
        makeBill('y', { amountMinor: 12000, cadence: 'yearly' }),
        makeBill('m', { amountMinor: 999 }),
      ]),
    });
    expect(minor('monthly-total')).toBe(12749);
    expect(minor('yearly-total')).toBe(152988);
    expect(screen.getByTestId('monthly-total').textContent).toBe('€127.49');
  });
});

describe('Bills (AC-BILL-1 to 10)', () => {
  it('adds a bill, accepting a comma decimal, and lists it sorted by next due', async () => {
    const { user, store } = renderApp({ route: '/bills', data: seeded([makeBill('late', { name: 'Late', anchorDate: '2026-12-30' })]) });
    await user.click(screen.getByTestId('bill-add-button'));
    const save = screen.getByTestId('bill-save-button') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByTestId('bill-save-hint').textContent).toBe('Add a name to save');
    await user.type(screen.getByTestId('bill-name-input'), 'Netflix');
    await user.type(screen.getByTestId('bill-amount-input'), '12,5');
    expect(screen.getByTestId('bill-amount-input-hint').textContent).toBe('= €12.50 / month');
    expect(save.disabled).toBe(false);
    await user.click(save);
    expect(screen.queryByTestId('bill-sheet')).toBeNull();
    const bills = store.getState().data.bills.filter((b) => b.name === 'Netflix');
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ amountMinor: 1250, cadence: 'monthly', anchorDate: '2026-11-21', leadDays: 3 });
    const rows = within(screen.getByTestId('bills-all')).getAllByRole('listitem');
    expect(rows[0]?.textContent).toContain('Netflix');
    expect(rows[0]?.textContent).toContain('Today');
  });

  it.each(['abc', '0', '-5'])('rejects amount %s inline and does not save', async (value) => {
    const { user, store } = renderApp({ route: '/bills', data: seeded([]) });
    await user.click(screen.getByTestId('bill-add-button'));
    await user.type(screen.getByTestId('bill-name-input'), 'X');
    await user.type(screen.getByTestId('bill-amount-input'), value);
    await user.tab();
    expect(screen.getByTestId('bill-amount-input-error')).toBeTruthy();
    expect((screen.getByTestId('bill-save-button') as HTMLButtonElement).disabled).toBe(true);
    expect(store.getState().data.bills).toHaveLength(0);
  });

  it('empty state offers one primary button and still shows 0.00 (AC-BILL-10)', () => {
    renderApp({ route: '/bills', data: seeded([]) });
    expect(screen.getByTestId('bills-empty')).toBeTruthy();
    expect(screen.getAllByTestId('bill-add-button')).toHaveLength(1);
    expect(minor('monthly-total')).toBe(0);
  });

  it('deletes with a 5 second Undo that restores the bill unchanged (AC-BILL-7)', async () => {
    const { user, store } = renderApp({ route: '/bills', data: seeded() });
    await user.click(rowButton('bill-row-b1'));
    const before = store.getState().data.bills[0];
    await user.click(screen.getByTestId('bill-delete-button'));
    expect(screen.queryByTestId('bill-row-b1')).toBeNull();
    expect(screen.getByTestId('toast-message').textContent).toBe('Netflix deleted');
    await user.click(screen.getByTestId('toast-action'));
    expect(screen.getByTestId('bill-row-b1')).toBeTruthy();
    const { updatedAt: _a, ...beforeFields } = before!;
    expect(store.getState().data.bills[0]).toMatchObject(beforeFields);
  });

  it('pauses and resumes: paused bills leave the total and show in Paused (AC-BILL-8)', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded() });
    expect(minor('monthly-total')).toBe(999);
    await user.click(rowButton('bill-row-b1'));
    await user.click(screen.getByTestId('bill-pause-button'));
    expect(minor('monthly-total')).toBe(0);
    expect(within(screen.getByTestId('bills-paused')).getByTestId('bill-row-b1')).toBeTruthy();
    await user.click(rowButton('bill-row-b1'));
    await user.click(screen.getByTestId('bill-resume-button'));
    expect(minor('monthly-total')).toBe(999);
  });

  it('exposes swipe actions through keyboard and the detail sheet, not only gestures', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded() });
    rowButton('bill-row-b1').focus();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByTestId('bill-delete-b1'));
    expect(screen.queryByTestId('bill-row-b1')).toBeNull();
  });

  it('filters by name case-insensitively (AC-BILL-13)', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded([makeBill('a', { name: 'Netflix' }), makeBill('b', { name: 'Rent' })]) });
    await user.type(screen.getByTestId('bill-search'), 'NET');
    expect(screen.getByTestId('bill-row-a')).toBeTruthy();
    expect(screen.queryByTestId('bill-row-b')).toBeNull();
  });
});

describe('Sheet behaviour', () => {
  it('closes on Escape when clean and asks to discard when dirty', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded([]) });
    await user.click(screen.getByTestId('bill-add-button'));
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('bill-sheet')).toBeNull();

    await user.click(screen.getByTestId('bill-add-button'));
    await user.type(screen.getByTestId('bill-name-input'), 'Abc');
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('discard-dialog')).toBeTruthy();
    await user.click(screen.getByTestId('discard-dialog-cancel'));
    expect(screen.getByTestId('bill-sheet')).toBeTruthy();
    await user.click(screen.getByTestId('bill-sheet-scrim'));
    await user.click(screen.getByTestId('discard-dialog-confirm'));
    expect(screen.queryByTestId('bill-sheet')).toBeNull();
  });

  it('is a modal dialog that makes the app behind inert', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded([]) });
    await user.click(screen.getByTestId('bill-add-button'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById('app-shell')?.hasAttribute('inert')).toBe(true);
  });
});

describe('Settings (AC-APP-4, 5, 8, 9)', () => {
  it('changing currency relabels amounts without converting numbers (AC-APP-5)', async () => {
    const { user } = renderApp({ route: '/bills', data: seeded() });
    expect(screen.getByTestId('monthly-total').textContent).toBe('€9.99');
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-currency-row'));
    await user.click(screen.getByTestId('currency-option-USD'));
    expect(screen.getByTestId('toast-message').textContent).toContain('Nothing is converted');
    await user.click(screen.getByTestId('settings-sheet-close'));
    expect(screen.getByTestId('monthly-total').textContent).toBe('$9.99');
    expect(minor('monthly-total')).toBe(999);
  });

  it('0-decimal currencies store and show whole units', async () => {
    const { user, store } = renderApp({ route: '/bills', data: { ...seeded([]), settings: { ...seeded().settings, currency: 'JPY' } } });
    await user.click(screen.getByTestId('bill-add-button'));
    await user.type(screen.getByTestId('bill-name-input'), 'Rent');
    await user.type(screen.getByTestId('bill-amount-input'), '1200');
    await user.click(screen.getByTestId('bill-save-button'));
    expect(store.getState().data.bills.at(-1)?.amountMinor).toBe(1200);
    expect(screen.getByTestId('monthly-total').textContent).toBe('¥1,200');
  });

  it('applies appearance and the default reminder', async () => {
    const { user, store } = renderApp({ route: '/today', data: seeded() });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-appearance-dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByTestId('settings-appearance-system'));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    await user.click(screen.getByTestId('settings-lead-7'));
    expect(store.getState().data.settings.defaultLeadDays).toBe(7);
  });

  it('erase needs the exact word ERASE and returns to onboarding', async () => {
    const { user, store, backend } = renderApp({ data: seeded() });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-erase-button'));
    const confirm = screen.getByTestId('erase-confirm-button') as HTMLButtonElement;
    await user.type(screen.getByTestId('erase-input'), 'erase');
    expect(confirm.disabled).toBe(true);
    await user.clear(screen.getByTestId('erase-input'));
    await user.type(screen.getByTestId('erase-input'), 'ERASE');
    expect(confirm.disabled).toBe(false);
    await user.click(confirm);
    expect(screen.getByTestId('onboarding')).toBeTruthy();
    expect(store.getState().data.bills).toHaveLength(0);
    expect(backend.map.has(STORAGE_KEY)).toBe(false);
  });

  it('import: invalid file shows an error and changes nothing; valid file previews counts then merges', async () => {
    const source = renderApp({ data: seeded([makeBill('x1', { name: 'Imported' })]) });
    const { createBackup } = await import('./lib/backup.ts');
    const text = createBackup(source.store.getState().data, '2026-11-20T10:00:00.000Z');
    source.unmount();

    const { user, store } = renderApp({ data: seeded([makeBill('local', { name: 'Local' })]) });
    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('settings-import-row'));
    const paste = screen.getByTestId('import-paste-input');
    await user.click(paste);
    await user.paste('not a backup');
    expect(screen.getByTestId('import-error').textContent).toContain('Nothing was changed');
    expect(screen.queryByTestId('import-confirm-button')).toBeNull();
    await user.clear(paste);
    await user.click(paste);
    await user.paste(text);
    expect(screen.getByTestId('import-counts').textContent).toBe('1 bills · 0 members · 0 lists · 0 items · 0 goals');
    await user.click(screen.getByTestId('import-confirm-button'));
    expect(store.getState().data.bills.map((b) => b.name).sort()).toEqual(['Imported', 'Local']);
  });

  it('export, erase, import round trip restores identical data (AC-APP-9)', async () => {
    const original = seeded([makeBill('b1', { name: 'Netflix', note: 'Family' })]);
    const { store } = renderApp({ data: original });
    const { createBackup, previewBackup } = await import('./lib/backup.ts');
    const text = createBackup(store.getState().data, '2026-11-21T10:00:00.000Z');
    act(() => store.erase());
    const preview = previewBackup(text);
    expect(preview.ok).toBe(true);
    if (preview.ok) act(() => store.replaceAll(preview.value.incoming));
    expect(store.getState().data.bills).toEqual(original.bills);
    expect(store.getState().data.settings.currency).toBe('EUR');
  });
});

describe('stored data problems', () => {
  it('shows a clear screen for corrupt data, keeps it until the user chooses', async () => {
    const { user, store, backend } = renderApp({ raw: '{broken' });
    expect(screen.getByTestId('corrupt-screen')).toBeTruthy();
    expect(backend.map.get(STORAGE_KEY)).toBe('{broken');
    await user.click(screen.getByTestId('corrupt-fresh-button'));
    await user.click(screen.getByTestId('fresh-dialog-confirm'));
    expect(store.getState().phase).toBe('ready');
    expect(screen.getByTestId('onboarding')).toBeTruthy();
  });

  it('shows the update screen for newer data and never writes', async () => {
    const newer = JSON.stringify({ app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION + 1, exportedAt: '2030-01-01T00:00:00.000Z', scope: 'all', data: {} });
    const { backend } = renderApp({ raw: newer });
    expect(screen.getByTestId('newer-screen')).toBeTruthy();
    expect(backend.map.get(STORAGE_KEY)).toBe(newer);
  });
});

describe('install banner (AC-APP-2)', () => {
  it('shows only in a non-standalone iOS tab', () => {
    const nav = navigator as Navigator & { standalone?: boolean };
    Object.defineProperty(nav, 'standalone', { value: false, configurable: true });
    const first = renderApp({ data: seeded() });
    expect(screen.getByTestId('install-banner')).toBeTruthy();
    first.unmount();
    Object.defineProperty(nav, 'standalone', { value: true, configurable: true });
    renderApp({ data: seeded() });
    expect(screen.queryByTestId('install-banner')).toBeNull();
    delete (nav as { standalone?: boolean }).standalone;
  });
});

describe('navigation (AC-APP-3)', () => {
  it('has four tabs and restores the last tab through the stored preference', async () => {
    const { user } = renderApp({ data: seeded() });
    for (const id of ['today', 'bills', 'home', 'goals']) expect(screen.getByTestId(`tab-${id}`)).toBeTruthy();
    await user.click(screen.getByTestId('tab-goals'));
    expect(screen.getByTestId('screen-goals')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('nestwise.ui') ?? '{}').lastTab).toBe('goals');
  });
});
