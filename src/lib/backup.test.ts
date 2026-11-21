import { describe, expect, it } from 'vitest';
import { backupFilename, countData, createBackup, previewBackup, restoreBackup } from './backup.ts';
import { softDelete } from './entities.ts';
import { CURRENT_SCHEMA_VERSION } from './migrations.ts';
import { createEnvelope, createListSnapshot } from './snapshot.ts';
import { emptyData } from './storage.ts';
import { makeItem, sampleData, T0 } from './test-fixtures.ts';

const NOW = '2026-11-21T12:00:00.000Z';

describe('backupFilename (AC-APP-8)', () => {
  it('is nestwise-backup-YYYY-MM-DD.json', () => {
    expect(backupFilename('2026-11-21')).toBe('nestwise-backup-2026-11-21.json');
  });
});

describe('createBackup', () => {
  it('contains every entity, the schema version and the export timestamp', () => {
    const parsed = JSON.parse(createBackup(sampleData(), NOW));
    expect(parsed).toMatchObject({ app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: NOW, scope: 'all' });
    expect(Object.keys(parsed.data).sort()).toEqual(['bills', 'goals', 'household', 'items', 'lists', 'members', 'settings']);
  });
});

describe('round trip (AC-APP-9)', () => {
  it('export, erase, import restores identical data: ids, amounts, dates', () => {
    const original = sampleData();
    const text = createBackup(original, NOW);
    const erased = emptyData();
    const preview = previewBackup(text);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const { data } = restoreBackup(erased, preview.value.incoming, 'replace', NOW);
    expect(data).toEqual(original);
    expect(data.bills.map((b) => [b.id, b.amountMinor, b.anchorDate])).toEqual(original.bills.map((b) => [b.id, b.amountMinor, b.anchorDate]));
  });

  it('keeps tombstones in the backup', () => {
    const original = sampleData();
    original.items.push(softDelete(makeItem('gone', 'l2'), T0));
    const preview = previewBackup(createBackup(original, NOW));
    expect(preview.ok && preview.value.incoming.items.find((i) => i.id === 'gone')?.deletedAt).toBe(T0);
  });
});

describe('previewBackup', () => {
  it('shows live counts and the export date', () => {
    const data = sampleData();
    data.items.push(softDelete(makeItem('gone', 'l2'), T0));
    const preview = previewBackup(createBackup(data, NOW));
    expect(preview.ok && preview.value.counts).toEqual({ bills: 2, members: 2, lists: 2, items: 2, goals: 1 });
    expect(preview.ok && preview.value.exportedAt).toBe(NOW);
    expect(countData(emptyData())).toEqual({ bills: 0, members: 0, lists: 0, items: 0, goals: 0 });
  });

  it('rejects corrupt, truncated, wrong and newer-version files with an error', () => {
    const text = createBackup(sampleData(), NOW);
    const cases: [string, string][] = [
      ['', 'not-json'],
      [text.slice(0, text.length / 2), 'not-json'],
      ['{"hello":1}', 'not-nestwise'],
      [JSON.stringify({ ...JSON.parse(text), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }), 'newer-version'],
      [JSON.stringify({ ...JSON.parse(text), data: { ...JSON.parse(text).data, bills: 'x' } }), 'invalid'],
    ];
    for (const [input, code] of cases) {
      const r = previewBackup(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(code);
    }
  });

  it('refuses a single-list snapshot', () => {
    const snap = createListSnapshot(sampleData(), 'l2', NOW)!;
    const r = previewBackup(JSON.stringify(snap));
    expect(r.ok).toBe(false);
    const wrong = previewBackup(JSON.stringify(createEnvelope('list', snap.data, NOW)));
    expect(wrong.ok).toBe(false);
  });
});

describe('restoreBackup merge mode (D11)', () => {
  it('merges per id, keeps this device\'s settings and reports a summary', () => {
    const local = sampleData();
    const remote = sampleData();
    remote.settings.currency = 'JPY';
    remote.items.push(makeItem('extra', 'l2'));
    remote.bills = remote.bills.map((b) => (b.id === 'b1' ? { ...b, name: 'Netflix HD', updatedAt: '2026-11-21T10:00:00.000Z' } : b));
    const { data, summary } = restoreBackup(local, remote, 'merge', NOW);
    expect(data.settings.currency).toBe('EUR');
    expect(data.items.map((i) => i.id)).toContain('extra');
    expect(data.bills.find((b) => b.id === 'b1')?.name).toBe('Netflix HD');
    expect(summary).toMatchObject({ added: 1, updated: 1, deleted: 0 });
  });

  it('merging a backup into itself changes nothing', () => {
    const local = sampleData();
    expect(restoreBackup(local, local, 'merge', NOW).data).toEqual(local);
  });
});
