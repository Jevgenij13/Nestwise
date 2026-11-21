import { useState, type FormEvent } from 'react';
import { AMOUNT_ERROR_TEXT, minorToInput, parseAmount } from '../../lib/money.ts';
import { useAppData, useCurrency, useStore } from '../../app/StoreProvider.tsx';
import { Button } from '../../components/Button.tsx';
import { TextField } from '../../components/Field.tsx';

/** Optional monthly income (AC-GOAL-10): Goals then offers "Left after bills" as a suggested monthly amount. Empty removes it. */
export function IncomePage({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const currency = useCurrency();
  const { settings } = useAppData();
  const [text, setText] = useState(settings.monthlyIncomeMinor === undefined ? '' : minorToInput(settings.monthlyIncomeMinor, currency));
  const parsed = text.trim() === '' ? null : parseAmount(text, currency);
  const error = parsed && !parsed.ok ? AMOUNT_ERROR_TEXT[parsed.error] : undefined;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    store.update((d) => {
      const { monthlyIncomeMinor: _old, ...rest } = d.settings;
      return { ...d, settings: parsed?.ok ? { ...rest, monthlyIncomeMinor: parsed.value } : rest };
    });
    onDone();
  };

  return (
    <form className="form" onSubmit={save} noValidate data-testid="income-page">
      <p className="t-callout">Used in Goals to show what is left after your bills. It stays on this phone.</p>
      <TextField label="Income per month" value={text} onChange={setText} error={error} prefix={currency} inputMode="decimal" autoComplete="off" placeholder="Not set" testId="income-input" />
      <Button type="submit" block disabled={Boolean(error)} data-testid="income-save-button">Save</Button>
    </form>
  );
}
