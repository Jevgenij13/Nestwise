import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrate } from './migrations.ts';

describe('migrate', () => {
  it('returns data unchanged at the current version', () => {
    const data = { a: 1 };
    expect(migrate(data, CURRENT_SCHEMA_VERSION)).toEqual({ ok: true, value: data });
  });

  it('refuses newer versions without touching data', () => {
    expect(migrate({}, CURRENT_SCHEMA_VERSION + 1)).toEqual({ ok: false, error: 'newer-version' });
  });

  it('rejects invalid versions', () => {
    for (const v of [0, -1, 1.5, Number.NaN]) expect(migrate({}, v)).toEqual({ ok: false, error: 'invalid-version' });
  });

  it('runs every step in order up to the target', () => {
    const table = {
      1: (d: unknown) => ({ ...(d as object), v2: true }),
      2: (d: unknown) => ({ ...(d as object), v3: true, order: [...((d as { order?: number[] }).order ?? []), 2] }),
      3: (d: unknown) => ({ ...(d as object), order: [...((d as { order?: number[] }).order ?? []), 3] }),
    };
    expect(migrate({ keep: 'me' }, 1, 4, table)).toEqual({ ok: true, value: { keep: 'me', v2: true, v3: true, order: [2, 3] } });
    expect(migrate({ keep: 'me' }, 3, 4, table)).toEqual({ ok: true, value: { keep: 'me', order: [3] } });
  });

  it('fails clearly when a step is missing or throws, instead of wiping data', () => {
    expect(migrate({}, 1, 3, { 1: (d) => d })).toEqual({ ok: false, error: 'migration-failed' });
    expect(
      migrate({}, 1, 2, {
        1: () => {
          throw new Error('boom');
        },
      }),
    ).toEqual({ ok: false, error: 'migration-failed' });
  });
});
