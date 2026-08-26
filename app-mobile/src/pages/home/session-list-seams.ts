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

import { compactId, timeBucket, type TimeBucket } from '../../shared/format/view-helpers.js';
import type { ConnectionPhase, SessionListState } from '../../shared/state/state.js';

export type { TimeBucket };
export { timeBucket };

// ───────────────────────────────────────────────────────────────────
// 2. TIME BUCKETS AND RECENCY SORT
// ───────────────────────────────────────────────────────────────────

/**
 * Running cards stay in Active even when their clock is older than the
 * one-hour window, because status is the host's live signal.
 */
export function sessionTimeBucket(item: SessionCardDto, now: number): TimeBucket {
  if (item.status === 'running') return 'active';
  return timeBucket(item.updatedAt, now);
}

/** Most recently updated first; ISO timestamps compare lexicographically. */
export function recencySort(items: readonly SessionCardDto[]): readonly SessionCardDto[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/**
 * Newest finite `updatedAt` first. An unparseable clock sinks last and never
 * becomes a fabricated recency, so the sort cannot invent "just now".
 */
export function sortByRecency(items: readonly SessionCardDto[]): readonly SessionCardDto[] {
  return [...items]
    .map((item, index) => ({ item, index, time: Date.parse(item.updatedAt) }))
    .sort((left, right) => {
      const leftOk = Number.isFinite(left.time);
      const rightOk = Number.isFinite(right.time);
      if (leftOk && !rightOk) return -1;
      if (!leftOk && rightOk) return 1;
      if (leftOk && rightOk && left.time !== right.time) return right.time - left.time;
      return left.index - right.index;
    })
    .map((entry) => entry.item);
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
    const bucket = sessionTimeBucket(item, now);
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

// ───────────────────────────────────────────────────────────────────
// 6. LIST STATE AND STATUS-GROUPED ROSTER
// ───────────────────────────────────────────────────────────────────

export type ListViewKind = 'loading' | 'error-retry' | 'host-too-old' | 'ready';

export interface DerivedListView {
  readonly kind: ListViewKind;
  readonly items: readonly SessionCardDto[];
  readonly error: string | null;
}

/**
 * Keep prior rows visible while a refetch is in flight. An empty catalog is
 * only "ready" once the host has answered; a failed fetch stays unresolved
 * instead of looking like "no sessions". Host-too-old needs a capability
 * signal the relay does not publish, so that kind never fires here.
 */
export function deriveListState(
  sessionState: SessionListState,
  connection: ConnectionPhase,
): DerivedListView {
  void connection;
  const items = sessionState.items;
  if (items.length > 0) {
    return { kind: 'ready', items, error: sessionState.error };
  }
  if (sessionState.phase === 'loading' || sessionState.phase === 'idle') {
    return { kind: 'loading', items, error: null };
  }
  if (sessionState.phase === 'error') {
    return { kind: 'error-retry', items, error: sessionState.error };
  }
  return { kind: 'ready', items, error: sessionState.error };
}

export interface StatusListSection {
  readonly bucket: StatusBucket;
  readonly count: number;
  readonly items: readonly SessionCardDto[];
}

export const STATUS_SECTION_LABELS: Record<StatusBucket, string> = {
  attention: 'Attention',
  unread: 'Unread',
  working: 'Running',
  idle: 'Idle',
  unknown: 'Unknown',
};

/**
 * True only when the host already published an `attention` field. The client
 * never invents that field; this gate stays false on today's DTO.
 */
export function hostAttentionPresent(items: readonly SessionCardDto[]): boolean {
  return items.some((item) => Object.prototype.hasOwnProperty.call(item, 'attention'));
}

/**
 * Always-present attention-first sections. Membership uses the same
 * first-match classifier as the counts, so a header cannot drift from its
 * rows. Within a section, newest finite clock wins.
 */
export function buildStatusList(
  items: readonly SessionCardDto[],
  unreadById: ReadonlySet<string> = new Set(),
): readonly StatusListSection[] {
  const buckets: Record<StatusBucket, SessionCardDto[]> = {
    attention: [],
    unread: [],
    working: [],
    idle: [],
    unknown: [],
  };
  for (const item of items) {
    buckets[sessionStatusGroup(item.status, unreadById.has(item.id))].push(item);
  }
  return BUCKET_DISPLAY_ORDER.map((bucket) => {
    const sorted = sortByRecency(buckets[bucket]);
    return { bucket, count: sorted.length, items: sorted };
  });
}

// ───────────────────────────────────────────────────────────────────
// 7. ORGANIZE PIPELINE (FILTER × SEARCH × BUCKET × FAVORITE)
// ───────────────────────────────────────────────────────────────────

export type StatusFilter = 'running' | 'idle' | 'interrupted';

export interface OrganizeInput {
  readonly filter: StatusFilter | null;
  readonly query: string;
  readonly favorites: ReadonlySet<string>;
  readonly now: number;
  readonly labels?: ReadonlyMap<string, string>;
}

export interface TimeListSection {
  readonly bucket: TimeBucket;
  readonly count: number;
  readonly items: readonly SessionCardDto[];
}

export interface OrganizeResult {
  readonly items: readonly SessionCardDto[];
  readonly timeSections: readonly TimeListSection[];
  readonly statusSections: readonly StatusListSection[];
}

export const TIME_SECTION_LABELS: Record<TimeBucket, string> = {
  active: 'Active',
  today: 'Today',
  yesterday: 'Yesterday',
  older: 'Older',
};

const TIME_DISPLAY_ORDER: readonly TimeBucket[] = ['active', 'today', 'yesterday', 'older'];

/**
 * Match only data this device already holds: the opaque id, its compact
 * form, and any device-local label. Host title/preview is never invented.
 */
export function matchesClientHeldQuery(
  item: SessionCardDto,
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  if (item.id.toLowerCase().includes(needle)) return true;
  if (compactId(item.id).toLowerCase().includes(needle)) return true;
  const label = labels.get(item.id);
  return label !== undefined && label.toLowerCase().includes(needle);
}

export function filterRoster(
  items: readonly SessionCardDto[],
  filter: StatusFilter | null,
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): readonly SessionCardDto[] {
  return items.filter((item) => {
    if (filter !== null && item.status !== filter) return false;
    return matchesClientHeldQuery(item, query, labels);
  });
}

/**
 * Float pinned ids to the front of an already-sorted section without
 * changing relative order inside the pinned or unpinned groups.
 */
export function floatFavorites(
  items: readonly SessionCardDto[],
  favorites: ReadonlySet<string>,
): readonly SessionCardDto[] {
  if (favorites.size === 0) return items;
  const pinned: SessionCardDto[] = [];
  const rest: SessionCardDto[] = [];
  for (const item of items) {
    if (favorites.has(item.id)) pinned.push(item);
    else rest.push(item);
  }
  return [...pinned, ...rest];
}

export function buildTimeList(
  items: readonly SessionCardDto[],
  now: number,
  favorites: ReadonlySet<string> = new Set(),
): readonly TimeListSection[] {
  const buckets: Record<TimeBucket, SessionCardDto[]> = {
    active: [],
    today: [],
    yesterday: [],
    older: [],
  };
  for (const item of items) {
    buckets[sessionTimeBucket(item, now)].push(item);
  }
  return TIME_DISPLAY_ORDER.flatMap((bucket) => {
    const sorted = floatFavorites(sortByRecency(buckets[bucket]), favorites);
    return sorted.length === 0 ? [] : [{ bucket, count: sorted.length, items: sorted }];
  });
}

/**
 * One composed pipeline over an immutable snapshot: status filter, then
 * client-held query, then time/status sections with favorites floated
 * inside each section.
 */
export function organize(
  items: readonly SessionCardDto[],
  input: OrganizeInput,
  unreadById: ReadonlySet<string> = new Set(),
): OrganizeResult {
  const filtered = filterRoster(items, input.filter, input.query, input.labels ?? new Map());
  const timeSections = buildTimeList(filtered, input.now, input.favorites);
  const statusSections = buildStatusList(filtered, unreadById).map((section) => ({
    ...section,
    items: floatFavorites(section.items, input.favorites),
    count: section.count,
  }));
  return { items: filtered, timeSections, statusSections };
}