import { describe, expect, it } from 'vitest';
import { divCeil, divRoundHalfUp, formatMoney, isValidCurrency, MAX_MINOR, minorDigits, minorToInput, parseAmount } from './money.ts';

const parse = (s: string, c = 'USD') => {
  const r = parseAmount(s, c);
  return r.ok ? r.value : r.error;
};

describe('minorDigits', () => {
  it('knows currency decimals', () => {
    expect(minorDigits('USD')).toBe(2);
    expect(minorDigits('EUR')).toBe(2);
    expect(minorDigits('JPY')).toBe(0);
    expect(minorDigits('KWD')).toBe(3);
  });
  it('falls back to 2 for invalid codes', () => {
    expect(minorDigits('NOPE!')).toBe(2);
  });
});

describe('isValidCurrency', () => {
  it('accepts ISO codes and rejects junk', () => {
    expect(isValidCurrency('EUR')).toBe(true);
    expect(isValidCurrency('eur')).toBe(true);
    expect(isValidCurrency('EURO')).toBe(false);
    expect(isValidCurrency('')).toBe(false);
    expect(isValidCurrency('12$')).toBe(false);
  });
});

describe('integer division helpers', () => {
  it('divRoundHalfUp rounds .5 up', () => {
    expect(divRoundHalfUp(5, 2)).toBe(3);
    expect(divRoundHalfUp(4, 3)).toBe(1);
    expect(divRoundHalfUp(1, 3)).toBe(0);
    expect(divRoundHalfUp(0, 12)).toBe(0);
    expect(divRoundHalfUp(52000, 12)).toBe(4333);
    expect(divRoundHalfUp(65000, 12)).toBe(5417);
  });
  it('divCeil rounds up only when there is a remainder', () => {
    expect(divCeil(400000, 12)).toBe(33334);
    expect(divCeil(12, 12)).toBe(1);
    expect(divCeil(0, 5)).toBe(0);
    expect(divCeil(1, 5)).toBe(1);
  });
});

describe('parseAmount (AC-BILL-2)', () => {
  it('accepts "12.5", "12,50" and "12"', () => {
    expect(parse('12.5')).toBe(1250);
    expect(parse('12,50')).toBe(1250);
    expect(parse('12')).toBe(1200);
  });
  it('handles surrounding space, leading/trailing separator and leading zeros', () => {
    expect(parse('  12.50 ')).toBe(1250);
    expect(parse('.5')).toBe(50);
    expect(parse('12.')).toBe(1200);
    expect(parse('007.05')).toBe(705);
    expect(parse('0.99')).toBe(99);
  });
  it('never loses precision to floating point', () => {
    expect(parse('0.07')).toBe(7);
    expect(parse('1.15')).toBe(115);
    expect(parse('19.99')).toBe(1999);
    expect(parse('4.35')).toBe(435);
  });
  it('accepts thousands grouping', () => {
    expect(parse('1,000.50')).toBe(100050);
    expect(parse('1.000,50')).toBe(100050);
    expect(parse('1,000,000')).toBe(100000000);
    expect(parse('1.000.000')).toBe(100000000);
    expect(parse('1 000')).toBe(100000);
    expect(parse('1\u00a0000')).toBe(100000);
    expect(parse("1'000.5")).toBe(100050);
  });
  it('rejects letters, zero, negative and empty input', () => {
    expect(parse('abc')).toBe('invalid');
    expect(parse('12a')).toBe('invalid');
    expect(parse('1e5')).toBe('invalid');
    expect(parse('.')).toBe('invalid');
    expect(parse('0')).toBe('zero');
    expect(parse('0.00')).toBe('zero');
    expect(parse('-5')).toBe('negative');
    expect(parse('-0')).toBe('negative');
    expect(parse('')).toBe('empty');
    expect(parse('   ')).toBe('empty');
  });
  it('rejects malformed separators', () => {
    expect(parse('1.2.3')).toBe('invalid');
    expect(parse('1,00,000')).toBe('invalid');
    expect(parse('1,5.50')).toBe('invalid');
    expect(parse('1,234.5.6')).toBe('invalid');
  });
  it('rejects too many decimals', () => {
    expect(parse('12.345')).toBe('too-many-decimals');
    expect(parse('12,999')).toBe('too-many-decimals');
  });
  it('rejects amounts above the maximum', () => {
    expect(parse('10000000000')).toBe(MAX_MINOR);
    expect(parse('10000000000.01')).toBe('too-large');
    expect(parse('99999999999999999')).toBe('too-large');
  });
  it('allows zero when asked (current savings)', () => {
    const r = parseAmount('0', 'USD', { allowZero: true });
    expect(r).toEqual({ ok: true, value: 0 });
  });
  it('handles 0-decimal currencies (AC-APP-5)', () => {
    expect(parse('1500', 'JPY')).toBe(1500);
    expect(parse('1,500', 'JPY')).toBe(1500);
    expect(parse('12.5', 'JPY')).toBe('too-many-decimals');
  });
  it('handles 3-decimal currencies', () => {
    expect(parse('1.234', 'KWD')).toBe(1234);
    expect(parse('1.2', 'KWD')).toBe(1200);
  });
});

describe('formatMoney', () => {
  it('formats with currency and locale', () => {
    expect(formatMoney(1250, 'USD', 'en-US')).toBe('$12.50');
    expect(formatMoney(0, 'USD', 'en-US')).toBe('$0.00');
    expect(formatMoney(152988, 'USD', 'en-US')).toBe('$1,529.88');
    expect(formatMoney(-500, 'USD', 'en-US')).toBe('-$5.00');
  });
  it('does not convert when the currency changes (AC-APP-5)', () => {
    expect(formatMoney(1250, 'EUR', 'en-US')).toBe('€12.50');
  });
  it('shows whole units for JPY', () => {
    expect(formatMoney(1500, 'JPY', 'en-US')).toBe('¥1,500');
  });
  it('uses locale conventions', () => {
    expect(formatMoney(123456, 'EUR', 'de-DE').replace(/\u00a0/g, ' ')).toBe('1.234,56 €');
  });
});

describe('minorToInput', () => {
  it('round-trips with parseAmount', () => {
    expect(minorToInput(1250, 'USD')).toBe('12.50');
    expect(minorToInput(5, 'USD')).toBe('0.05');
    expect(minorToInput(0, 'USD')).toBe('0.00');
    expect(minorToInput(1200, 'JPY')).toBe('1200');
    expect(minorToInput(1234, 'KWD')).toBe('1.234');
    for (const minor of [1, 99, 100, 1250, 99999999]) {
      expect(parse(minorToInput(minor, 'USD'))).toBe(minor);
    }
  });
});
