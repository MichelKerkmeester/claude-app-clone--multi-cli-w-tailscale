// ───────────────────────────────────────────────────────────────────
// MODULE: Home Roster Seams
// ───────────────────────────────────────────────────────────────────

// Pure roster projections over SessionListState items plus a device-local
// unread bit. Every function reads only existing DTO fields (id, status,
// updatedAt, messageCount) and never writes status or invents host truth.
// A running-but-unread card is classified by its status first, so it is
// never double-listed as unread.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TIME BUCKETS AND RECENCY SORT
// ───────────────────────────────────────────────────────────────────

export type TimeBucket = 'active' | 'today' | 'yesterday' | 'older';

const ACTIVE_WINDOW_MS = 60 * 60_000;

function sameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

export function timeBucket(updatedAt: string, now: number): TimeBucket {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return 'older';
  const elapsed = now - updated.getTime();
  if (elapsed < ACTIVE_WINDOW_MS) return 'active';
  const nowDate = new Date(now);
  if (sameUtcDay(updated, nowDate)) return 'today';
  const yesterday = new Date(nowDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return sameUtcDay(updated, yesterday) ? 'yesterday' : 'older';
}

/** Most recently updated first; ISO timestamps compare lexicographically. */
export function recencySort(items: readonly SessionCardDto[]): readonly SessionCardDto[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export interface TimeBucketGroup {
  readonly bucket: TimeBucket;
  readonly sessions: readonly SessionCardDto[];
}

export function groupByTimeBucket(
  items: readonly SessionCardDto[],
  now: number,
): readonly TimeBucketGroup[] {
  const groups = new Map<TimeBucket, SessionCardDto[]>();
  for (const item of items) {
    const bucket = timeBucket(item.updatedAt, now);
    const list = groups.get(bucket);
    if (list === undefined) groups.set(bucket, [item]);
    else list.push(item);
  }
  const displayOrder: readonly TimeBucket[] = ['active', 'today', 'yesterday', 'older'];
  return displayOrder
    .filter((bucket) => groups.get(bucket) !== undefined)
    .map((bucket) => ({ bucket, sessions: groups.get(bucket) ?? [] }));
}

// ───────────────────────────────────────────────────────────────────
// 3. STATUS MEMBERSHIP AND BUCKETS
// ───────────────────────────────────────────────────────────────────

export type StatusBucket = 'attention' | 'unread' | 'working' | 'idle' | 'unknown';

/**
 * First-match membership precedence: attention → working → unread → idle →
 * unknown. A still-running-but-unread card stays under Working, so it is
 * never double-classified as Unread. The unread bit is device-local; it
 * can never outrank a host-reported running status.
 */
export function sessionStatusGroup(
  status: SessionCardDto['status'],
  unread: boolean,
): StatusBucket {
  if (status === 'interrupted') return 'attention';
  if (status === 'running') return 'working';
  if (unread) return 'unread';
  if (status === 'idle') return 'idle';
  return 'unknown';
}

export interface StatusBucketSection {
  readonly bucket: StatusBucket;
  readonly count: number;
}

/**
 * Flatten the roster into always-present bucket sections, each carrying a
 * count derived by the same classifier as the rows it will render.
 */
export function bucketByStatus(
  sessions: readonly SessionCardDto[],
  unreadIds?: ReadonlySet<string>,
): readonly StatusBucketSection[] {
  const counts: Record<StatusBucket, number> = {
    attention: 0,
    unread: 0,
    working: 0,
    idle: 0,
    unknown: 0,
  };
  for (const session of sessions) {
    const bucket = sessionStatusGroup(session.status, unreadIds?.has(session.id) ?? false);
    counts[bucket] += 1;
  }
  return BUCKET_DISPLAY_ORDER.map((bucket) => ({ bucket, count: counts[bucket] }));
}

// ───────────────────────────────────────────────────────────────────
// 4. UNREAD-AWARE BUCKET LATTICE
// ───────────────────────────────────────────────────────────────────

/** Classifier priority: which bucket a card belongs to, first match wins. */
export const BUCKET_MEMBERSHIP_PRIORITY: readonly StatusBucket[] = [
  'attention',
  'working',
  'unread',
  'idle',
  'unknown',
];

/** Presentation order: which bucket the view renders first. */
export const BUCKET_DISPLAY_ORDER: readonly StatusBucket[] = [
  'attention',
  'unread',
  'working',
  'idle',
  'unknown',
];

/**
 * The lattice is the pair (membership priority, display order) resolved per
 * card: membership decides the section, display order decides its position.
 * A running card's membership is `working` under either reading, so it is
 * never displayed as unread.
 */
export function unreadAwareBucket(
  status: SessionCardDto['status'],
  unread: boolean,
): { readonly membership: StatusBucket; readonly display: StatusBucket } {
  const membership = sessionStatusGroup(status, unread);
  return { membership, display: membership };
}

/** Rank of a bucket in the display order (for placing sections). */
export function displayOrderIndex(bucket: StatusBucket): number {
  return BUCKET_DISPLAY_ORDER.indexOf(bucket);
}

// ───────────────────────────────────────────────────────────────────
// 5. FLATTENED-LIST SINGLE-OWNER DEDUP
// ───────────────────────────────────────────────────────────────────

export interface RosterReconcileInput {
  readonly cacheItems: readonly SessionCardDto[];
  readonly liveItems: readonly SessionCardDto[];
}

/**
 * When a roster reconciles cache vs live rows, each session id has exactly
 * one owner. Cache rows are a read-only projection; live rows are the
 * host's freshest word, so a later live row overwrites the cached one —
 * closing the window where a just-committed snapshot and the live rows
 * emit the same id twice.
 */
export function dedupSessions(input: RosterReconcileInput): readonly SessionCardDto[] {
  const owner = new Map<string, SessionCardDto>();
  for (const item of input.cacheItems) owner.set(item.id, item);
  for (const item of input.liveItems) owner.set(item.id, item);
  return [...owner.values()];
}