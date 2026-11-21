import { describe, expect, it } from 'vitest';
import { daysAgoText, formatLongDate, formatShortDate, leadChipLabel, leadSentence, relativeDueLabel } from './format.ts';

describe('dates', () => {
  it('formats short and long dates without time zone shifts', () => {
    expect(formatShortDate('2026-11-24', 'en-US')).toBe('Tue, Nov 24');
    expect(formatShortDate('2026-11-24', 'en-GB')).toBe('Tue 24 Nov');
    expect(formatLongDate('2026-11-21', 'en-GB')).toBe('Saturday 21 November');
  });
});

describe('relativeDueLabel', () => {
  it('uses plain words for the first days', () => {
    expect(relativeDueLabel(0)).toBe('Today');
    expect(relativeDueLabel(1)).toBe('Tomorrow');
    expect(relativeDueLabel(3)).toBe('In 3 days');
    expect(relativeDueLabel(31)).toBe('In 31 days');
  });

  it('switches to months and years', () => {
    expect(relativeDueLabel(32)).toBe('In 1 month');
    expect(relativeDueLabel(90)).toBe('In 3 months');
    expect(relativeDueLabel(365)).toBe('In 1 year');
    expect(relativeDueLabel(800)).toBe('In 2 years');
  });
});

describe('lead and ago labels', () => {
  it('labels reminder leads', () => {
    expect([0, 1, 3, 7].map((d) => leadChipLabel(d as 0))).toEqual(['On the day', '1 day', '3 days', '1 week']);
    expect([0, 1, 3, 7].map((d) => leadSentence(d as 0))).toEqual(['On the day', '1 day before', '3 days before', '1 week before']);
  });

  it('words days ago', () => {
    expect(daysAgoText(0)).toBe('today');
    expect(daysAgoText(1)).toBe('1 day ago');
    expect(daysAgoText(41)).toBe('41 days ago');
  });
});
