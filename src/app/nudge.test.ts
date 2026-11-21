import { describe, expect, it } from 'vitest';
import { backupNudge } from './nudge.ts';
import { emptyData } from '../lib/storage.ts';
import { makeBill, makeData } from '../lib/test-fixtures.ts';

const NOW = new Date('2026-11-21T12:00:00Z');
const withBill = (lastBackupAt: string | null) => {
  const d = makeData({ bills: [makeBill('b1')] });
  return { ...d, settings: { ...d.settings, lastBackupAt } };
};

describe('backupNudge', () => {
  it('stays quiet with no data', () => {
    expect(backupNudge(emptyData(), 'denied', NOW, undefined)).toBeNull();
  });

  it('nudges when there was never a backup or the last one is 30+ days old', () => {
    expect(backupNudge(withBill(null), 'granted', NOW, undefined)).toEqual({ daysSinceBackup: null, atRisk: false });
    expect(backupNudge(withBill('2026-10-11T12:00:00Z'), 'granted', NOW, undefined)).toEqual({ daysSinceBackup: 41, atRisk: false });
    expect(backupNudge(withBill('2026-10-23T12:00:00Z'), 'granted', NOW, undefined)).toBeNull();
  });

  it('flags storage that is not guaranteed even after a recent backup', () => {
    expect(backupNudge(withBill('2026-11-20T12:00:00Z'), 'denied', NOW, undefined)).toEqual({ daysSinceBackup: 1, atRisk: true });
    expect(backupNudge(withBill('2026-11-20T12:00:00Z'), 'unknown', NOW, undefined)).toBeNull();
  });

  it('respects a recent dismissal', () => {
    expect(backupNudge(withBill(null), 'granted', NOW, '2026-11-18T12:00:00Z')).toBeNull();
  });
});
