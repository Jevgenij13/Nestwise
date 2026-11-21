import type { AppData, DateString, Envelope, EnvelopeScope, IsoTimestamp, List, ListSnapshotData } from '../types.ts';
import { isLive } from './entities.ts';
import { CURRENT_SCHEMA_VERSION, migrate } from './migrations.ts';
import { err, ok, type Result } from './result.ts';
import { isCompleteAppData, validateData, type ValidatedData } from './validate.ts';

/** Backup (scope "all") and single-list snapshot (scope "list") envelopes, plus the copyable share code. */

export type EnvelopeErrorCode = 'not-json' | 'not-nestwise' | 'newer-version' | 'invalid' | 'migration-failed' | 'bad-code';

export interface EnvelopeError {
  code: EnvelopeErrorCode;
  /** Plain-language message safe to show to the user. */
  message: string;
}

const fail = (code: EnvelopeErrorCode, message: string) => err<EnvelopeError>({ code, message });

export type ParsedEnvelope =
  | { scope: 'all'; schemaVersion: number; exportedAt: IsoTimestamp; data: AppData }
  | { scope: 'list'; schemaVersion: number; exportedAt: IsoTimestamp; data: ValidatedData };

export function createEnvelope<D>(scope: EnvelopeScope, data: D, now: IsoTimestamp): Envelope<D> {
  return { app: 'nestwise', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: now, scope, data };
}

/**
 * Parses and validates backup or snapshot text. Any problem (not JSON, wrong app, newer schema, bad
 * shape) returns an error and the caller changes nothing (AC-HOME-11, AC-APP-9). Older schema versions are migrated.
 */
export function parseEnvelope(text: string): Result<ParsedEnvelope, EnvelopeError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('not-json', 'This is not a valid Nestwise file.');
  }
  if (typeof raw !== 'object' || raw === null || (raw as Record<string, unknown>).app !== 'nestwise') return fail('not-nestwise', 'This is not a Nestwise backup or snapshot.');
  const env = raw as Record<string, unknown>;
  const version = env.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return fail('invalid', 'This file has no valid version.');
  if (env.scope !== 'all' && env.scope !== 'list') return fail('invalid', 'This file has an unknown type.');
  if (typeof env.exportedAt !== 'string' || Number.isNaN(Date.parse(env.exportedAt))) return fail('invalid', 'This file has no valid export date.');

  const migrated = migrate(env.data, version);
  if (!migrated.ok) {
    return migrated.error === 'newer-version'
      ? fail('newer-version', 'This file was made by a newer version of Nestwise. Update the app and try again.')
      : fail('migration-failed', 'This file is too old or damaged to be upgraded.');
  }

  const required = env.scope === 'all' ? (['settings', 'household', 'members', 'bills', 'lists', 'items', 'goals'] as const) : (['lists', 'items', 'members'] as const);
  const data = validateData(migrated.value, required);
  if (!data.ok) return fail('invalid', `This file is damaged (${data.error})`);

  if (env.scope === 'all') {
    if (!isCompleteAppData(data.value)) return fail('invalid', 'This backup is incomplete.');
    return ok({ scope: 'all', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: env.exportedAt, data: { ...data.value, settings: { ...data.value.settings, schemaVersion: CURRENT_SCHEMA_VERSION } } });
  }
  if (data.value.lists?.length !== 1) return fail('invalid', 'A list snapshot must contain exactly one list.');
  return ok({ scope: 'list', schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: env.exportedAt, data: data.value });
}

/**
 * Single-list snapshot (AC-HOME-10): the list, all its items including tombstones (so deletions
 * propagate), and the members those items reference. Null when the list does not exist or is deleted.
 */
export function createListSnapshot(data: AppData, listId: string, now: IsoTimestamp): Envelope<ListSnapshotData> | null {
  const list: List | undefined = data.lists.find((l) => l.id === listId && isLive(l));
  if (!list) return null;
  const items = data.items.filter((i) => i.listId === listId);
  const referenced = new Set<string>();
  for (const item of items) {
    if (item.assigneeId) referenced.add(item.assigneeId);
    if (item.doneBy) referenced.add(item.doneBy.memberId);
  }
  const members = data.members.filter((m) => referenced.has(m.id));
  return createEnvelope('list', { lists: [list], items, members }, now);
}

export function listSnapshotFilename(listName: string, today: DateString): string {
  const slug = listName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return `nestwise-list-${slug || 'list'}-${today}.json`;
}

const CODE_PREFIX = 'NW1.';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(encoded) || encoded.length % 4 === 1) return null;
  try {
    return Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function fromBase64Url(encoded: string): string | null {
  const bytes = base64UrlToBytes(encoded);
  if (bytes === null) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function pipeBytes(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // Not awaited: the output is read below, and awaiting a write before reading can stall on back-pressure.
  void writer.write(bytes as BufferSource).catch(() => {});
  void writer.close().catch(() => {});
  return new Uint8Array(await new Response(transform.readable).arrayBuffer());
}

const COMPRESSED_PREFIX = 'NW2.';

/** Whether this browser can build and read compressed codes (CompressionStream, iOS 16.4+). */
export const canCompress = (): boolean => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/**
 * Compact code for links and QR: "NW2." + base64url(deflate-raw(UTF-8 JSON)). Several times shorter than "NW1." so a
 * 50 item list still fits a QR code (AC-HOME-14). Readers accept both prefixes; the copyable code stays "NW1.".
 */
export async function encodeCompressedShareCode(envelope: Envelope<unknown>): Promise<string> {
  const packed = await pipeBytes(new TextEncoder().encode(JSON.stringify(envelope)), new CompressionStream('deflate-raw'));
  return COMPRESSED_PREFIX + bytesToBase64Url(packed);
}

/** Decodes "NW1." or "NW2." share codes. An "NW2." code on a browser without DecompressionStream is reported as unreadable. */
export async function decodeAnyShareCode(code: string): Promise<Result<ParsedEnvelope, EnvelopeError>> {
  const compact = code.replace(/\s+/g, '');
  if (!compact.startsWith(COMPRESSED_PREFIX)) return decodeShareCode(compact);
  const bytes = base64UrlToBytes(compact.slice(COMPRESSED_PREFIX.length));
  if (bytes === null || !canCompress()) return fail('bad-code', 'This code is incomplete or damaged. Copy the whole code and try again.');
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(await pipeBytes(bytes, new DecompressionStream('deflate-raw')));
    return parseEnvelope(json);
  } catch {
    return fail('bad-code', 'This code is incomplete or damaged. Copy the whole code and try again.');
  }
}

/** Copyable text code for a snapshot: "NW1." + base64url(UTF-8 JSON). Pure text, safe to paste into any chat. */
export function encodeShareCode(envelope: Envelope<unknown>): string {
  return CODE_PREFIX + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));
}

/** Decodes and validates a pasted share code; tolerates surrounding whitespace and line breaks from chat apps. */
export function decodeShareCode(code: string): Result<ParsedEnvelope, EnvelopeError> {
  const compact = code.replace(/\s+/g, '');
  if (!compact.startsWith(CODE_PREFIX)) return fail('bad-code', 'This code is not a Nestwise share code. Copy the whole code and try again.');
  const json = fromBase64Url(compact.slice(CODE_PREFIX.length));
  if (json === null) return fail('bad-code', 'This code is incomplete or damaged. Copy the whole code and try again.');
  return parseEnvelope(json);
}
