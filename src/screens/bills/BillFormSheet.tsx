import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BillCategory, Cadence, LeadDays } from '../../types.ts';
import { CADENCE_LABEL, validateBillForm } from '../../lib/bills.ts';
import { BILL_NOTE_MAX, billInputOf, createBill, editBill, type BillInput } from '../../lib/billOps.ts';
import { isValidDate } from '../../lib/dates.ts';
import { LEAD_OPTIONS, formatShortDate, leadChipLabel } from '../../lib/format.ts';
import { BILL_NAME_MAX } from '../../lib/limits.ts';
import { AMOUNT_ERROR_TEXT, minorToInput, type AmountError } from '../../lib/money.ts';
import { monthlyEquivalentMinor } from '../../lib/recurrence.ts';
import { nextDue } from '../../lib/bills.ts';
import { useAppData, useCurrency, useMoney, useStore, useToday } from '../../app/StoreProvider.tsx';
import { deviceLocale } from '../../app/locale.ts';
import { useOverlays } from '../../app/overlays.tsx';
import { Button } from '../../components/Button.tsx';
import { ChoiceChips, type ChipOption } from '../../components/Chips.tsx';
import { TextAreaField, TextField } from '../../components/Field.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { CATEGORY_LABEL } from './BillRowView.tsx';
import { useBillActions } from './useBillActions.ts';

const CADENCES: readonly Cadence[] = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
const CADENCE_OPTIONS: ChipOption<Cadence>[] = CADENCES.map((c) => ({ value: c, label: CADENCE_LABEL[c], testId: `bill-cadence-${c}` }));
const LEAD_CHIPS: ChipOption<LeadDays>[] = LEAD_OPTIONS.map((l) => ({ value: l, label: leadChipLabel(l), testId: `bill-lead-${l}` }));
const CATEGORIES = Object.keys(CATEGORY_LABEL) as BillCategory[];
const CATEGORY_OPTIONS: ChipOption<BillCategory>[] = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c], testId: `bill-category-${c}` }));

interface FormState {
  name: string;
  amount: string;
  cadence: Cadence;
  anchorDate: string;
  leadDays: LeadDays;
  category: BillCategory | undefined;
  note: string;
  endDate: string;
}

/** Errors that are clearly wrong are shown while typing; "empty" and "zero" wait for blur so the first keystroke is never an error (DESIGN 5.3). */
const EARLY_AMOUNT_ERRORS: readonly AmountError[] = ['invalid', 'negative', 'too-many-decimals', 'too-large'];

function amountErrorText(code: AmountError): string {
  return code === 'empty' || code === 'zero' ? 'Enter an amount above 0' : AMOUNT_ERROR_TEXT[code];
}

/** Add / edit bill (AC-BILL-1, 2, 4, 7, 8; P1: 14, 15). Opens large; Save is disabled, with a hint, until valid. */
export function BillFormSheet({ billId }: { billId?: string }) {
  const store = useStore();
  const { bills, settings } = useAppData();
  const today = useToday();
  const currency = useCurrency();
  const format = useMoney();
  const { close } = useOverlays();
  const actions = useBillActions();
  const bill = billId ? bills.find((b) => b.id === billId && b.deletedAt === null) : undefined;
  const editing = bill !== undefined;

  const initial = useMemo<FormState>(() => {
    if (bill) {
      const input = billInputOf(bill);
      return { name: input.name, amount: minorToInput(input.amountMinor, currency), cadence: input.cadence, anchorDate: input.anchorDate, leadDays: input.leadDays, category: input.category, note: input.note ?? '', endDate: input.endDate ?? '' };
    }
    return { name: '', amount: '', cadence: 'monthly', anchorDate: today, leadDays: settings.defaultLeadDays, category: undefined, note: '', endDate: '' };
    // The form is seeded once when it opens; later store changes must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<FormState>(initial);
  const [touched, setTouched] = useState({ name: false, amount: false });
  const [moreOpen, setMoreOpen] = useState(Boolean(initial.category || initial.note || initial.endDate));
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  // The bill can disappear while the sheet is open (e.g. an Undo elsewhere); close rather than edit a ghost.
  useEffect(() => {
    if (billId && !bill) close();
  }, [billId, bill, close]);

  const validation = validateBillForm({ name: form.name, amount: form.amount }, currency);
  const errors = validation.ok ? {} : validation.error;
  const dateOk = isValidDate(form.anchorDate);
  const endOk = form.endDate === '' || isValidDate(form.endDate);
  const canSave = validation.ok && dateOk && endOk && form.note.length <= BILL_NOTE_MAX;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const nameError = errors.name === 'too-long' ? `Use ${BILL_NAME_MAX} characters or fewer` : errors.name === 'required' && touched.name ? 'Add a name' : undefined;
  const amountError = errors.amount && (touched.amount || EARLY_AMOUNT_ERRORS.includes(errors.amount)) ? amountErrorText(errors.amount) : undefined;

  const monthly = validation.ok ? monthlyEquivalentMinor(validation.value.amountMinor, form.cadence) : null;
  const nextPayment = dateOk ? formatShortDate(nextDue({ anchorDate: form.anchorDate, cadence: form.cadence }, today), deviceLocale()) : null;

  const hint = errors.name ? 'Add a name to save' : errors.amount ? 'Enter an amount to save' : !dateOk ? 'Pick a date to save' : !endOk ? 'Fix the end date to save' : '';

  const save = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, amount: true });
    if (!validation.ok || !canSave) return;
    const input: BillInput = {
      name: validation.value.name,
      amountMinor: validation.value.amountMinor,
      cadence: form.cadence,
      anchorDate: form.anchorDate,
      leadDays: form.leadDays,
      note: form.note,
      category: form.category,
      endDate: form.endDate || undefined,
    };
    store.update((d, c) => ({
      ...d,
      bills: bill ? d.bills.map((b) => (b.id === bill.id ? editBill(b, input, c.now) : b)) : [...d.bills, createBill(input, c.newId(), c.now)],
    }));
    close();
  };

  return (
    <Sheet
      title={editing ? 'Edit bill' : 'New bill'}
      onClose={close}
      dirty={dirty}
      testId="bill-sheet"
      footer={
        <>
          {hint && <p className="sheet__hint t-footnote" data-testid="bill-save-hint">{hint}</p>}
          <Button type="submit" form="bill-form" disabled={!canSave} block data-testid="bill-save-button">
            {editing ? 'Save changes' : 'Save bill'}
          </Button>
        </>
      }
    >
      <form id="bill-form" className="form" onSubmit={save} noValidate>
        <TextField
          label="Name"
          value={form.name}
          onChange={(name) => patch({ name })}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={nameError}
          hint={form.name.length >= 50 ? `${form.name.length} / ${BILL_NAME_MAX}` : undefined}
          testId="bill-name-input"
          autoFocus={!editing}
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="next"
        />
        <TextField
          label="Amount"
          value={form.amount}
          onChange={(amount) => patch({ amount })}
          onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
          error={amountError}
          hint={monthly !== null ? `= ${format(monthly)} / month` : undefined}
          testId="bill-amount-input"
          prefix={currency}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          className="input__control--money"
        />
        <ChoiceChips label="How often" options={CADENCE_OPTIONS} value={form.cadence} onChange={(cadence) => patch({ cadence })} testId="bill-cadence" />
        <TextField
          label="Next due date"
          type="date"
          value={form.anchorDate}
          onChange={(anchorDate) => patch({ anchorDate })}
          error={dateOk ? undefined : 'Pick a date'}
          hint={nextPayment ? `Next payment: ${nextPayment}` : undefined}
          testId="bill-date-input"
        />
        <ChoiceChips label="Remind me" options={LEAD_CHIPS} value={form.leadDays} onChange={(leadDays) => patch({ leadDays })} testId="bill-lead" />

        <button type="button" className="disclosure tap-target" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)} data-testid="bill-more-toggle">
          More options
          <Icon name={moreOpen ? 'chevron-down' : 'chevron-right'} size={18} />
        </button>
        {moreOpen && (
          <>
            <ChoiceChips label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(category) => patch({ category: category === form.category ? undefined : category })} testId="bill-category" />
            <TextAreaField label="Note" value={form.note} onChange={(note) => patch({ note })} error={form.note.length > BILL_NOTE_MAX ? `Use ${BILL_NOTE_MAX} characters or fewer` : undefined} rows={2} testId="bill-note-input" />
            <TextField label="End date (optional)" type="date" value={form.endDate} onChange={(endDate) => patch({ endDate })} error={endOk ? undefined : 'Pick a valid date'} hint="After this date the bill moves to Ended." testId="bill-end-input" />
          </>
        )}

        {editing && bill && (
          <div className="form__danger">
            {bill.status === 'paused' ? (
              <Button variant="secondary" block onClick={() => { actions.resume(bill); close(); }} data-testid="bill-resume-button">Resume bill</Button>
            ) : (
              <Button variant="secondary" block onClick={() => { actions.pause(bill); close(); }} data-testid="bill-pause-button">Pause bill</Button>
            )}
            <Button variant="text" className="btn--danger-text" block onClick={() => { actions.remove(bill); close(); }} data-testid="bill-delete-button">Delete bill</Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
