import { err, ok, type Result } from './result.ts';

/** Current persisted schema version. Bump when the stored shape changes and add a migration below. */
export const CURRENT_SCHEMA_VERSION = 1;

export type MigrationError = 'newer-version' | 'invalid-version' | 'migration-failed';

/** Migrates a raw `data` payload from version N to N + 1. */
export type Migration = (data: unknown) => unknown;

/** `MIGRATIONS[n]` upgrades schema version n to n + 1. Empty while the schema is at v1. */
export const MIGRATIONS: Record<number, Migration> = {};

/** Runs migrations one version at a time; never skips a step and never wipes data. */
export function migrate(data: unknown, fromVersion: number, target = CURRENT_SCHEMA_VERSION, table: Record<number, Migration> = MIGRATIONS): Result<unknown, MigrationError> {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return err('invalid-version');
  if (fromVersion > target) return err('newer-version');
  let current = data;
  for (let v = fromVersion; v < target; v++) {
    const step = table[v];
    if (!step) return err('migration-failed');
    try {
      current = step(current);
    } catch {
      return err('migration-failed');
    }
  }
  return ok(current);
}
