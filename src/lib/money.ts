import { err, ok, type Result } from './result.ts';

/** Largest accepted amount in minor units; keeps all integer arithmetic far below 2^53. */
export const MAX_MINOR = 1_000_000_000_000;

const digitsCache = new Map<string, number>();

/** Number of minor-unit decimals for an ISO 4217 code (USD 2, JPY 0, KWD 3). Falls back to 2. */
export function minorDigits(currency: string): number {
  const cached = digitsCache.get(currency);
  if (cached !== undefined) return cached;
  let digits = 2;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Unknown currency code: keep the default.
  }
  digitsCache.set(currency, digits);
  return digits;
}

export function isValidCurrency(code: string): boolean {
  if (!/^[A-Za-z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

/** Integer division rounding half up, for non-negative integers. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** Integer division rounding up, for non-negative numerator and positive denominator. */
export function divCeil(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

export type AmountError = 'empty' | 'invalid' | 'negative' | 'zero' | 'too-many-decimals' | 'too-large';

export const AMOUNT_ERROR_TEXT: Record<AmountError, string> = {
  empty: 'Enter an amount.',
  invalid: 'Enter a number, like 12.50.',
  negative: 'The amount cannot be negative.',
  zero: 'The amount must be greater than 0.',
  'too-many-decimals': 'Too many decimal places for this currency.',
  'too-large': 'That amount is too large.',
};

const GROUP_RE_DOT = /^\d{1,3}(?:\.\d{3})+$/;
const GROUP_RE_COMMA = /^\d{1,3}(?:,\d{3})+$/;

/**
 * Parse user input into integer minor units (AC-BILL-2): "12.5", "12,50" and "12" give 1250, 1250, 1200 for 2-decimal currencies.
 * Spaces and apostrophes are ignored as grouping. A single "," or "." is the decimal separator, except
 * that for 0-decimal currencies (JPY) exactly three digits after it mean thousands ("1,000" is 1000).
 * With both separators the last one is the decimal separator. Never goes through floating point.
 */
export function parseAmount(input: string, currency: string, options: { allowZero?: boolean } = {}): Result<number, AmountError> {
  const s = input.trim().replace(/[\s\u00a0\u202f']/g, '');
  if (s === '') return err('empty');
  if (/^-[\d.,]/.test(s)) return err('negative');
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return err('invalid');

  const digits = minorDigits(currency);
  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  let intPart: string;
  let fracPart = '';

  if (dots > 0 && commas > 0) {
    const decimalSep = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const groupSep = decimalSep === '.' ? ',' : '.';
    const at = s.lastIndexOf(decimalSep);
    const intRaw = s.slice(0, at);
    fracPart = s.slice(at + 1);
    const groupRe = groupSep === ',' ? GROUP_RE_COMMA : GROUP_RE_DOT;
    if (!groupRe.test(intRaw) || fracPart.includes(groupSep) || s.indexOf(decimalSep) !== at) return err('invalid');
    intPart = intRaw.split(groupSep).join('');
  } else if (dots + commas > 1) {
    const groupRe = dots > 0 ? GROUP_RE_DOT : GROUP_RE_COMMA;
    if (!groupRe.test(s)) return err('invalid');
    intPart = s.replace(/[.,]/g, '');
  } else if (dots + commas === 1) {
    const at = s.search(/[.,]/);
    intPart = s.slice(0, at);
    fracPart = s.slice(at + 1);
    if (digits === 0 && fracPart.length === 3 && intPart !== '') {
      intPart += fracPart;
      fracPart = '';
    }
  } else {
    intPart = s;
  }

  if (fracPart.length > digits) return err('too-many-decimals');
  intPart = intPart.replace(/^0+(?=\d)/, '');
  if (intPart === '') intPart = '0';
  if (intPart.length > 13) return err('too-large');

  const minor = Number(intPart) * 10 ** digits + (fracPart === '' ? 0 : Number(fracPart.padEnd(digits, '0')));
  if (minor > MAX_MINOR) return err('too-large');
  if (minor === 0 && !options.allowZero) return err('zero');
  return ok(minor);
}

/** Format minor units for display with the device locale (AC-GOAL-8). */
export function formatMoney(minor: number, currency: string, locale?: string): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 10 ** digits);
}

/** Plain decimal string for prefilling an input: 1250 -> "12.50", 1200 with JPY -> "1200". */
export function minorToInput(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  if (digits === 0) return String(minor);
  const sign = minor < 0 ? '-' : '';
  const abs = String(Math.abs(minor)).padStart(digits + 1, '0');
  return `${sign}${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
}
