import { describe, expect, it } from 'vitest';
import { currencyOptions } from './currencies.ts';

describe('currencyOptions', () => {
  it('lists ISO codes with names, sorted', () => {
    const options = currencyOptions();
    const codes = options.map((o) => o.code);
    expect(codes).toEqual([...codes].sort());
    expect(options.find((o) => o.code === 'EUR')?.name).toBe('Euro');
    expect(options.find((o) => o.code === 'JPY')).toBeDefined();
  });

  it('always includes extra valid codes and ignores invalid ones', () => {
    const codes = currencyOptions(['dkk', 'nope']).map((o) => o.code);
    expect(codes).toContain('DKK');
    expect(codes).not.toContain('NOPE');
  });
});
