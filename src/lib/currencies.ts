import { isValidCurrency } from './money.ts';

export interface CurrencyOption {
  code: string;
  name: string;
}

/** Fallback when the browser cannot enumerate currencies (very old engines). */
const COMMON = ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'INR', 'JPY', 'KRW', 'MXN', 'NOK', 'NZD', 'PLN', 'SEK', 'SGD', 'TRY', 'UAH', 'USD', 'ZAR'];

function supportedCodes(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  try {
    const codes = intl.supportedValuesOf?.('currency');
    if (codes && codes.length > 0) return codes;
  } catch {
    // Fall through to the common list.
  }
  return COMMON;
}

/** ISO 4217 codes with English names, sorted by code (AC-APP-1 list). `extra` ensures the current code is always present. */
export function currencyOptions(extra: readonly string[] = [], locale = 'en'): CurrencyOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'currency' });
  } catch {
    names = null;
  }
  const codes = new Set([...supportedCodes(), ...extra.filter(isValidCurrency).map((c) => c.toUpperCase())]);
  return [...codes]
    .sort()
    .map((code) => ({ code, name: names?.of(code) ?? code }));
}
