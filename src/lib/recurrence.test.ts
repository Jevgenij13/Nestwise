import { describe, expect, it } from 'vitest';
import { addDays } from './dates.ts';
import { advanceOnce, monthlyEquivalentMinor, nextOccurrence, occurrenceAt, occurrencesInWindow, type RecurrenceKind } from './recurrence.ts';

describe('nextOccurrence: AC-BILL-4 table (today 2026-11-21)', () => {
  it('monthly anchor 2026-01-31 gives 2026-11-30', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-11-21')).toBe('2026-11-30');
  });
  it('the same bill on 2027-02-01 gives 2027-02-28', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2027-02-01')).toBe('2027-02-28');
  });
  it('yearly anchor 2024-02-29 gives 2027-02-28', () => {
    expect(nextOccurrence('2024-02-29', 'yearly', '2026-11-21')).toBe('2027-02-28');
  });
  it('every 2 weeks anchor 2026-11-14 gives 2026-11-28', () => {
    expect(nextOccurrence('2026-11-14', 'biweekly', '2026-11-21')).toBe('2026-11-28');
  });
  it('quarterly anchor 2026-08-21 gives 2026-11-21 (due today counts)', () => {
    expect(nextOccurrence('2026-08-21', 'quarterly', '2026-11-21')).toBe('2026-11-21');
  });
});

describe('nextOccurrence: more cases', () => {
  it('returns the anchor itself when it is today or in the future', () => {
    expect(nextOccurrence('2026-11-21', 'weekly', '2026-11-21')).toBe('2026-11-21');
    expect(nextOccurrence('2027-05-05', 'monthly', '2026-11-21')).toBe('2027-05-05');
  });
  it('weekly steps by 7 days', () => {
    expect(nextOccurrence('2026-11-01', 'weekly', '2026-11-21')).toBe('2026-11-22');
    expect(nextOccurrence('2026-11-07', 'weekly', '2026-11-21')).toBe('2026-11-21');
  });
  it('monthly day-of-month is kept after clamping (31 Jan -> 28 Feb -> 31 Mar)', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28');
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-04-01')).toBe('2026-04-30');
  });
  it('anchor 29 Feb gives 28 Feb in non-leap years and 29 Feb in leap years', () => {
    expect(nextOccurrence('2024-02-29', 'yearly', '2025-01-01')).toBe('2025-02-28');
    expect(nextOccurrence('2024-02-29', 'yearly', '2028-01-01')).toBe('2028-02-29');
    expect(nextOccurrence('2024-02-29', 'monthly', '2025-02-01')).toBe('2025-02-28');
  });
  it('crosses year ends', () => {
    expect(nextOccurrence('2026-12-15', 'monthly', '2026-12-16')).toBe('2027-01-15');
    expect(nextOccurrence('2026-11-30', 'quarterly', '2026-12-01')).toBe('2027-02-28');
  });
  it('daily steps by one day', () => {
    expect(nextOccurrence('2026-11-01', 'daily', '2026-11-21')).toBe('2026-11-21');
  });
  it('matches brute-force iteration for every cadence and tricky anchors', () => {
    const kinds: RecurrenceKind[] = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
    const anchors = ['2024-02-29', '2025-01-31', '2025-05-30', '2025-08-31', '2026-03-01'];
    for (const kind of kinds) {
      for (const anchor of anchors) {
        for (let offset = 0; offset < 800; offset += 13) {
          const from = addDays('2025-01-01', offset);
          let k = 0;
          while (occurrenceAt(anchor, kind, k) < from) k++;
          expect(nextOccurrence(anchor, kind, from)).toBe(occurrenceAt(anchor, kind, k));
        }
      }
    }
  });
});

describe('occurrenceAt', () => {
  it('counts monthly steps from the anchor, never drifting', () => {
    expect([0, 1, 2, 3].map((k) => occurrenceAt('2026-01-31', 'monthly', k))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });
  it('quarterly and yearly', () => {
    expect([0, 1, 2, 3].map((k) => occurrenceAt('2026-01-31', 'quarterly', k))).toEqual(['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
    expect([0, 1, 2, 3, 4].map((k) => occurrenceAt('2024-02-29', 'yearly', k))).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });
});

describe('occurrencesInWindow', () => {
  it('lists monthly occurrences with month-end clamping', () => {
    expect(occurrencesInWindow('2026-01-31', 'monthly', '2027-01-01', '2027-04-30')).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });
  it('includes both window ends', () => {
    expect(occurrencesInWindow('2026-11-14', 'weekly', '2026-11-21', '2026-12-05')).toEqual(['2026-11-21', '2026-11-28', '2026-12-05']);
  });
  it('is empty when no occurrence falls in the window or the window is reversed', () => {
    expect(occurrencesInWindow('2026-11-14', 'monthly', '2026-11-15', '2026-12-13')).toEqual([]);
    expect(occurrencesInWindow('2026-11-14', 'weekly', '2026-12-05', '2026-11-21')).toEqual([]);
  });
  it('starts at a future anchor', () => {
    expect(occurrencesInWindow('2026-12-01', 'weekly', '2026-11-21', '2026-12-15')).toEqual(['2026-12-01', '2026-12-08', '2026-12-15']);
  });
  it('is not confused by DST weekends', () => {
    expect(occurrencesInWindow('2026-03-14', 'biweekly', '2026-03-20', '2026-04-20')).toEqual(['2026-03-28', '2026-04-11']);
  });
  it('respects the limit', () => {
    expect(occurrencesInWindow('2026-01-01', 'daily', '2026-01-01', '2030-01-01', 5)).toHaveLength(5);
  });
  it('gives 24 months of explicit dates for a day-31 monthly bill (AC-BILL-12)', () => {
    const dates = occurrencesInWindow('2026-01-31', 'monthly', '2026-11-21', '2028-11-20');
    expect(dates).toHaveLength(24);
    expect(dates.slice(0, 4)).toEqual(['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
  });
});

describe('advanceOnce (chore repeat, AC-HOME-13)', () => {
  it('adds one interval to the previous date', () => {
    expect(advanceOnce('2026-11-21', 'weekly')).toBe('2026-11-28');
    expect(advanceOnce('2026-11-21', 'daily')).toBe('2026-11-22');
    expect(advanceOnce('2026-11-21', 'biweekly')).toBe('2026-12-05');
    expect(advanceOnce('2026-01-31', 'monthly')).toBe('2026-02-28');
  });
});

describe('monthlyEquivalentMinor (PRD section 5)', () => {
  it('matches the PRD examples', () => {
    expect(monthlyEquivalentMinor(1000, 'weekly')).toBe(4333);
    expect(monthlyEquivalentMinor(2500, 'biweekly')).toBe(5417);
    expect(monthlyEquivalentMinor(3000, 'quarterly')).toBe(1000);
    expect(monthlyEquivalentMinor(12000, 'yearly')).toBe(1000);
    expect(monthlyEquivalentMinor(999, 'monthly')).toBe(999);
  });
  it('rounds half up to the minor unit', () => {
    expect(monthlyEquivalentMinor(6, 'yearly')).toBe(1);
    expect(monthlyEquivalentMinor(5, 'yearly')).toBe(0);
    expect(monthlyEquivalentMinor(1, 'weekly')).toBe(4);
    expect(monthlyEquivalentMinor(1, 'biweekly')).toBe(2);
  });
});
