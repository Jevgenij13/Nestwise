import { describe, expect, it } from 'vitest';
import { billInputOf, createBill, deleteBill, editBill, setBillStatus, undeleteBill } from './billOps.ts';
import { makeBill } from './test-fixtures.ts';

const T1 = '2026-11-22T10:00:00.000Z';
const base = { name: 'Netflix', amountMinor: 999, cadence: 'monthly' as const, anchorDate: '2026-11-24', leadDays: 3 as const };

describe('createBill', () => {
  it('creates an active bill with timestamps and no empty optional fields', () => {
    const bill = createBill({ ...base, note: '  ', category: undefined }, 'b1', T1);
    expect(bill).toEqual({ id: 'b1', createdAt: T1, updatedAt: T1, deletedAt: null, status: 'active', ...base });
    expect('note' in bill).toBe(false);
  });

  it('keeps trimmed note, category and end date', () => {
    const bill = createBill({ ...base, note: ' Family plan ', category: 'subscriptions', endDate: '2027-01-01' }, 'b1', T1);
    expect(bill.note).toBe('Family plan');
    expect(bill.category).toBe('subscriptions');
    expect(bill.endDate).toBe('2027-01-01');
  });
});

describe('editBill', () => {
  it('applies fields, bumps updatedAt, keeps id, createdAt and status', () => {
    const original = makeBill('b1', { status: 'paused', note: 'old', category: 'other' });
    const edited = editBill(original, { ...base, name: 'Disney+' }, T1);
    expect(edited).toMatchObject({ id: 'b1', createdAt: original.createdAt, updatedAt: T1, name: 'Disney+', status: 'paused' });
    expect('note' in edited).toBe(false);
    expect('category' in edited).toBe(false);
  });
});

describe('status and delete', () => {
  it('pauses and resumes only the target bill', () => {
    const bills = [makeBill('a'), makeBill('b')];
    const paused = setBillStatus(bills, 'a', 'paused', T1);
    expect(paused[0]).toMatchObject({ status: 'paused', updatedAt: T1 });
    expect(paused[1]).toBe(bills[1]);
    expect(setBillStatus(paused, 'a', 'active', T1)[0]?.status).toBe('active');
  });

  it('delete then undo returns the same content', () => {
    const bills = [makeBill('a', { note: 'x' })];
    const deleted = deleteBill(bills, 'a', T1);
    expect(deleted[0]?.deletedAt).toBe(T1);
    const restored = undeleteBill(deleted, 'a', '2026-11-22T10:00:03.000Z');
    expect(restored[0]).toMatchObject({ ...bills[0], updatedAt: '2026-11-22T10:00:03.000Z', deletedAt: null });
  });
});

describe('billInputOf', () => {
  it('round-trips through editBill without changes', () => {
    const bill = makeBill('a', { note: 'n', endDate: '2027-02-01' });
    expect(editBill(bill, billInputOf(bill), T1)).toEqual({ ...bill, updatedAt: T1 });
  });
});
