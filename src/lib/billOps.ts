import type { Bill, BillCategory, Cadence, DateString, IsoTimestamp, LeadDays } from '../types.ts';
import { restore, softDelete, updateEntity } from './entities.ts';

/** Pure bill mutations used by the UI (AC-BILL-1, 7, 8). Every change bumps `updatedAt` so it wins merges. */

export const BILL_NOTE_MAX = 200; // AC-BILL-14

export interface BillInput {
  name: string;
  amountMinor: number;
  cadence: Cadence;
  anchorDate: DateString;
  leadDays: LeadDays;
  note?: string;
  category?: BillCategory;
  endDate?: DateString;
}

/** Optional fields are only present when set, so stored bills stay minimal. */
function optionalFields(input: BillInput): Pick<Bill, 'note' | 'category' | 'endDate'> {
  const fields: Pick<Bill, 'note' | 'category' | 'endDate'> = {};
  const note = input.note?.trim();
  if (note) fields.note = note.slice(0, BILL_NOTE_MAX);
  if (input.category) fields.category = input.category;
  if (input.endDate) fields.endDate = input.endDate;
  return fields;
}

export function createBill(input: BillInput, id: string, now: IsoTimestamp): Bill {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: input.name,
    amountMinor: input.amountMinor,
    cadence: input.cadence,
    anchorDate: input.anchorDate,
    leadDays: input.leadDays,
    status: 'active',
    ...optionalFields(input),
  };
}

/** Applies the edit form. Status is kept; cleared optional fields are removed. */
export function editBill(bill: Bill, input: BillInput, now: IsoTimestamp): Bill {
  const { note: _note, category: _category, endDate: _endDate, ...rest } = bill;
  return updateEntity(
    { ...rest, ...optionalFields(input) },
    { name: input.name, amountMinor: input.amountMinor, cadence: input.cadence, anchorDate: input.anchorDate, leadDays: input.leadDays },
    now,
  );
}

function mapBill(bills: Bill[], id: string, fn: (bill: Bill) => Bill): Bill[] {
  return bills.map((bill) => (bill.id === id ? fn(bill) : bill));
}

export function setBillStatus(bills: Bill[], id: string, status: Bill['status'], now: IsoTimestamp): Bill[] {
  return mapBill(bills, id, (bill) => updateEntity(bill, { status }, now));
}

/** Delete = tombstone (D11); `undeleteBill` is the Undo and returns the bill unchanged apart from `updatedAt`. */
export function deleteBill(bills: Bill[], id: string, now: IsoTimestamp): Bill[] {
  return mapBill(bills, id, (bill) => softDelete(bill, now));
}

export function undeleteBill(bills: Bill[], id: string, now: IsoTimestamp): Bill[] {
  return mapBill(bills, id, (bill) => restore(bill, now));
}

/** Compact signature of the editable fields, to tell whether a form is dirty. */
export function billInputOf(bill: Bill): BillInput {
  const input: BillInput = { name: bill.name, amountMinor: bill.amountMinor, cadence: bill.cadence, anchorDate: bill.anchorDate, leadDays: bill.leadDays };
  if (bill.note) input.note = bill.note;
  if (bill.category) input.category = bill.category;
  if (bill.endDate) input.endDate = bill.endDate;
  return input;
}
