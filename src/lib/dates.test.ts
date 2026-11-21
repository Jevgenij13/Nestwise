import { afterEach, describe, expect, it } from 'vitest';
import { addDays, addMonths, compareDates, daysBetween, daysInMonth, formatDate, formatDateLong, formatMonthYear, isValidDate, localToday, monthsUntilCeil, parseDate, relativeDayText } from './dates.ts';

describe('parseDate / isValidDate', () => {
  it('accepts real calendar dates', () => {
    expect(parseDate('2026-11-21')).toEqual({ y: 2026, m: 11, d: 21 });
    expect(isValidDate('2024-02-29')).toBe(true);
  });
  it('rejects malformed and impossible dates', () => {
    for (const bad of ['', '2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '2026-11-00', '26-01-01', '2026-1-1', '2026/11/21', '2026-11-21T00:00:00Z', ' 2026-11-21']) {
      expect(isValidDate(bad)).toBe(false);
    }
  });
  it('throws a clear error for invalid input to arithmetic', () => {
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });
});

describe('daysInMonth / formatDate', () => {
  it('handles leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
  it('zero-pads', () => {
    expect(formatDate(2026, 3, 5)).toBe('2026-03-05');
  });
});

describe('addDays / daysBetween', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-21', 7)).toBe('2026-11-28');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-11-21', 0)).toBe('2026-11-21');
  });
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-11-21', '2026-11-24')).toBe(3);
    expect(daysBetween('2026-11-24', '2026-11-21')).toBe(-3);
    expect(daysBetween('2026-11-21', '2026-11-21')).toBe(0);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
  });
});

describe('DST safety', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it.each(['Europe/London', 'America/New_York', 'Australia/Lord_Howe', 'Pacific/Apia'])('date arithmetic is exact across DST changes in %s', (tz) => {
    process.env.TZ = tz;
    // Spring-forward and fall-back weekends in several hemispheres.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addMonths('2026-03-31', 7)).toBe('2026-10-31');
  });

  it('localToday uses local calendar fields, not UTC', () => {
    process.env.TZ = 'America/New_York';
    expect(localToday(new Date(2026, 10, 1, 23, 59))).toBe('2026-11-01');
    expect(localToday(new Date(2026, 10, 1, 0, 1))).toBe('2026-11-01');
    process.env.TZ = 'Pacific/Auckland';
    expect(localToday(new Date(2026, 8, 27, 0, 30))).toBe('2026-09-27');
  });
});

describe('addMonths', () => {
  it('clamps to the month end and keeps the anchor day (PRD section 5)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30');
    expect(addMonths('2026-02-28', 1, 31)).toBe('2026-03-31');
  });
  it('handles leap day anchors', () => {
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonths('2024-02-29', 48)).toBe('2028-02-29');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
  it('crosses years and supports negatives and zero', () => {
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
    expect(addMonths('2026-11-21', 0)).toBe('2026-11-21');
    expect(addMonths('2026-11-21', 40)).toBe('2030-03-21');
  });
});

describe('monthsUntilCeil', () => {
  it('is whole months rounded up', () => {
    expect(monthsUntilCeil('2026-11-21', '2027-11-21')).toBe(12);
    expect(monthsUntilCeil('2026-11-21', '2027-11-22')).toBe(13);
    expect(monthsUntilCeil('2026-11-21', '2027-11-20')).toBe(12);
    expect(monthsUntilCeil('2026-11-21', '2026-11-22')).toBe(1);
    expect(monthsUntilCeil('2026-11-21', '2026-12-21')).toBe(1);
  });
  it('is 0 for same or earlier dates', () => {
    expect(monthsUntilCeil('2026-11-21', '2026-11-21')).toBe(0);
    expect(monthsUntilCeil('2026-11-21', '2026-01-01')).toBe(0);
  });
  it('agrees with addMonths clamping at month ends', () => {
    expect(monthsUntilCeil('2026-01-31', '2026-02-28')).toBe(1);
    expect(monthsUntilCeil('2026-01-31', '2026-03-01')).toBe(2);
    expect(monthsUntilCeil('2026-01-31', '2026-03-31')).toBe(2);
  });
  it('is the smallest n with addMonths(from, n) >= to', () => {
    const from = '2026-01-31';
    for (let offset = 1; offset < 500; offset += 7) {
      const to = addDays(from, offset);
      const n = monthsUntilCeil(from, to);
      expect(compareDates(addMonths(from, n), to)).toBeGreaterThanOrEqual(0);
      expect(compareDates(addMonths(from, n - 1), to)).toBeLessThan(0);
    }
  });
});

describe('formatting', () => {
  it('formats month and year', () => {
    expect(formatMonthYear('2030-03-21', 'en-US')).toBe('Mar 2030');
    expect(formatMonthYear('2027-09-30', 'en-US')).toBe('Sep 2027');
  });
  it('formats a full date', () => {
    expect(formatDateLong('2026-11-21', 'en-US')).toBe('Nov 21, 2026');
  });
  it('relative day text (AC-BILL-3, AC-HOME-9)', () => {
    expect(relativeDayText(0)).toBe('Today');
    expect(relativeDayText(1)).toBe('Tomorrow');
    expect(relativeDayText(3)).toBe('in 3 days');
    expect(relativeDayText(-1)).toBe('1 day overdue');
    expect(relativeDayText(-2)).toBe('2 days overdue');
  });
  it('compareDates orders lexicographically', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareDates('2026-01-01', '2026-01-01')).toBe(0);
  });
});
