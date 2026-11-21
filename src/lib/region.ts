import { isValidCurrency } from './money.ts';

/** Region (ISO 3166-1 alpha-2) to ISO 4217 currency, for preselecting the default currency (AC-APP-1). */
const EURO = 'EUR';
const REGION_CURRENCY: Record<string, string> = {
  // Euro area
  AD: EURO, AT: EURO, BE: EURO, CY: EURO, DE: EURO, EE: EURO, ES: EURO, FI: EURO, FR: EURO, GR: EURO, HR: EURO, IE: EURO, IT: EURO,
  LT: EURO, LU: EURO, LV: EURO, MC: EURO, ME: EURO, MT: EURO, NL: EURO, PT: EURO, SI: EURO, SK: EURO, SM: EURO, VA: EURO, XK: EURO,
  // Rest of Europe
  AL: 'ALL', BA: 'BAM', BG: 'BGN', BY: 'BYN', CH: 'CHF', CZ: 'CZK', DK: 'DKK', GB: 'GBP', GI: 'GIP', HU: 'HUF', IS: 'ISK', LI: 'CHF',
  MD: 'MDL', MK: 'MKD', NO: 'NOK', PL: 'PLN', RO: 'RON', RS: 'RSD', RU: 'RUB', SE: 'SEK', UA: 'UAH',
  // Americas
  AR: 'ARS', BO: 'BOB', BR: 'BRL', CA: 'CAD', CL: 'CLP', CO: 'COP', CR: 'CRC', DO: 'DOP', EC: 'USD', GT: 'GTQ', HN: 'HNL', JM: 'JMD',
  MX: 'MXN', NI: 'NIO', PA: 'PAB', PE: 'PEN', PR: 'USD', PY: 'PYG', SV: 'USD', US: 'USD', UY: 'UYU', VE: 'VES',
  // Asia and Pacific
  AU: 'AUD', BD: 'BDT', BN: 'BND', CN: 'CNY', FJ: 'FJD', HK: 'HKD', ID: 'IDR', IN: 'INR', JP: 'JPY', KH: 'KHR', KR: 'KRW', KZ: 'KZT',
  LK: 'LKR', MM: 'MMK', MN: 'MNT', MO: 'MOP', MY: 'MYR', NP: 'NPR', NZ: 'NZD', PH: 'PHP', PK: 'PKR', SG: 'SGD', TH: 'THB', TW: 'TWD',
  UZ: 'UZS', VN: 'VND',
  // Middle East and Africa
  AE: 'AED', BH: 'BHD', DZ: 'DZD', EG: 'EGP', ET: 'ETB', GH: 'GHS', IL: 'ILS', IQ: 'IQD', IR: 'IRR', JO: 'JOD', KE: 'KES', KW: 'KWD',
  LB: 'LBP', LY: 'LYD', MA: 'MAD', NG: 'NGN', OM: 'OMR', QA: 'QAR', SA: 'SAR', TN: 'TND', TR: 'TRY', TZ: 'TZS', UG: 'UGX', ZA: 'ZAR',
};

export const FALLBACK_CURRENCY = 'USD';

/** Currency for a region code like "DK"; undefined when unknown. */
export function currencyForRegion(region: string): string | undefined {
  return REGION_CURRENCY[region.toUpperCase()];
}

function regionOf(tag: string): string | undefined {
  try {
    const locale = new Intl.Locale(tag);
    return locale.region ?? locale.maximize().region;
  } catch {
    return undefined;
  }
}

/**
 * Default currency from the device's language tags, e.g. "da-DK" gives DKK, "en-GB" gives GBP, "de" gives EUR.
 * The first tag whose region is known wins; falls back to USD.
 */
export function currencyForLocale(locales: string | readonly string[] | undefined): string {
  const tags = typeof locales === 'string' ? [locales] : [...(locales ?? [])];
  for (const tag of tags) {
    const region = regionOf(tag);
    const currency = region ? currencyForRegion(region) : undefined;
    if (currency && isValidCurrency(currency)) return currency;
  }
  return FALLBACK_CURRENCY;
}
