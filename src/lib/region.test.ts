import { describe, expect, it } from 'vitest';
import { currencyForLocale, currencyForRegion, FALLBACK_CURRENCY } from './region.ts';

describe('currencyForLocale', () => {
  it('uses the region of the language tag', () => {
    expect(currencyForLocale('en-US')).toBe('USD');
    expect(currencyForLocale('en-GB')).toBe('GBP');
    expect(currencyForLocale('da-DK')).toBe('DKK');
    expect(currencyForLocale('de-AT')).toBe('EUR');
    expect(currencyForLocale('ja-JP')).toBe('JPY');
    expect(currencyForLocale('pt-BR')).toBe('BRL');
    expect(currencyForLocale('en-AU')).toBe('AUD');
  });

  it('infers the likely region when the tag has none', () => {
    expect(currencyForLocale('de')).toBe('EUR');
    expect(currencyForLocale('sv')).toBe('SEK');
    expect(currencyForLocale('ja')).toBe('JPY');
  });

  it('takes the first language whose region is known', () => {
    expect(currencyForLocale(['zz-ZZ', 'nb-NO', 'en-US'])).toBe('NOK');
  });

  it('falls back to USD for unknown, empty or malformed input', () => {
    expect(currencyForLocale('zz-ZZ')).toBe(FALLBACK_CURRENCY);
    expect(currencyForLocale('')).toBe(FALLBACK_CURRENCY);
    expect(currencyForLocale('!!!')).toBe(FALLBACK_CURRENCY);
    expect(currencyForLocale(undefined)).toBe(FALLBACK_CURRENCY);
    expect(currencyForLocale([])).toBe(FALLBACK_CURRENCY);
  });
});

describe('currencyForRegion', () => {
  it('is case-insensitive and returns undefined when unknown', () => {
    expect(currencyForRegion('dk')).toBe('DKK');
    expect(currencyForRegion('ZZ')).toBeUndefined();
  });
});
