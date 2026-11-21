import type { AppData, EntityBase, IsoTimestamp, MergeableCollections } from '../types.ts';
import { TOMBSTONE_TTL_DAYS } from './limits.ts';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowIso(now: Date = new Date()): IsoTimestamp {
  return now.toISOString();
}

export function isLive(entity: EntityBase): boolean {
  return entity.deletedAt === null;
}

/** Returns a copy with the patch applied and `updatedAt` bumped. */
export function updateEntity<T extends EntityBase>(entity: T, patch: Partial<Omit<T, keyof EntityBase>>, now: IsoTimestamp): T {
  return { ...entity, ...patch, updatedAt: now };
}

/** Tombstone (D11): marks deleted; `updatedAt` is bumped so the deletion wins merges. */
export function softDelete<T extends EntityBase>(entity: T, now: IsoTimestamp): T {
  return { ...entity, deletedAt: now, updatedAt: now };
}

/** Restores a tombstoned entity (Undo). */
export function restore<T extends EntityBase>(entity: T, now: IsoTimestamp): T {
  return { ...entity, deletedAt: null, updatedAt: now };
}

export const COLLECTION_KEYS = ['members', 'bills', 'lists', 'items', 'goals'] as const satisfies readonly (keyof MergeableCollections)[];

export function tombstoneExpired(entity: EntityBase, now: IsoTimestamp): boolean {
  if (entity.deletedAt === null) return false;
  return Date.parse(now) - Date.parse(entity.deletedAt) > TOMBSTONE_TTL_DAYS * 86_400_000;
}

/** Drops tombstones older than 30 days (D11). */
export function purgeTombstones(data: AppData, now: IsoTimestamp): AppData {
  const purged: AppData = { ...data };
  for (const key of COLLECTION_KEYS) {
    (purged[key] as EntityBase[]) = (data[key] as EntityBase[]).filter((e) => !tombstoneExpired(e, now));
  }
  if (data.household && tombstoneExpired(data.household, now)) purged.household = null;
  return purged;
}
