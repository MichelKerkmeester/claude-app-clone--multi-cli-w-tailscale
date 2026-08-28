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

export const SMART_STALE_MS = 20 * 60_000;

export type SmartClass = 'needs-you' | 'done-but-not-stale' | 'working' | 'idle/stale';

const SMART_CLASS_RANK: Record<SmartClass, number> = {
  'needs-you': 0,
  'done-but-not-stale': 1,
  working: 2,
  'idle/stale': 3,
};

function hasNeedsYouSignal(item: SessionCardDto): boolean {
  if (item.status === 'interrupted' || item.status === 'running') {
    return item.status === 'interrupted';
  }
  return item.attention === 'blocked' || item.attention === 'waiting';
}

function isFresh(item: SessionCardDto, now: number): boolean {
  const updatedAt = Date.parse(item.updatedAt);
  return Number.isFinite(updatedAt) && now - updatedAt < SMART_STALE_MS;
}

/** Classify cards without inferring a missing host status or timestamp. */
export function smartClass(item: SessionCardDto, now: number): SmartClass {
  if (hasNeedsYouSignal(item)) return 'needs-you';
  if (item.status === 'idle' && isFresh(item, now)) return 'done-but-not-stale';
  if (item.status === 'running' && isFresh(item, now)) return 'working';
  return 'idle/stale';
}

/** Compare the four smart classes, then use the host clock as a stable tie-breaker. */
export function compareSmartSessions(
  left: SessionCardDto,
  right: SessionCardDto,
  now: number,
): number {
  const classDifference = SMART_CLASS_RANK[smartClass(left, now)] - SMART_CLASS_RANK[smartClass(right, now)];
  if (classDifference !== 0) return classDifference;
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  const leftOk = Number.isFinite(leftTime);
  const rightOk = Number.isFinite(rightTime);
  if (leftOk && !rightOk) return -1;
  if (!leftOk && rightOk) return 1;
  if (leftOk && rightOk && leftTime !== rightTime) return rightTime - leftTime;
  return 0;
}

/** Smart order is a pure copy; it never mutates the host-owned input array. */
export function sortBySmart(
  items: readonly SessionCardDto[],
  now: number = Date.now(),
): readonly SessionCardDto[] {
  return [...items].sort((left, right) => compareSmartSessions(left, right, now));
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

export interface CollapsibleSectionState {
  readonly key: string;
  readonly collapsible: boolean;
  readonly open: boolean;
}

/** Force only real disclosure sections open while a query or filter is active. */
export function forceExpandSections(
  sections: readonly CollapsibleSectionState[],
  filtering: boolean,
): readonly CollapsibleSectionState[] {
  if (!filtering || !sections.some((section) => section.collapsible)) return sections;
  return sections.map((section) =>
    section.collapsible && !section.open ? { ...section, open: true } : section,
  );
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
  query = '',
  labels: ReadonlyMap<string, string> = new Map(),
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
    const sorted = sortBySearchRelevance(sortByRecency(buckets[bucket]), query, labels);
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
  readonly smartItems: readonly SessionCardDto[];
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

export interface ParsedRosterQuery {
  readonly freeTerms: readonly string[];
  readonly repo: readonly string[];
  readonly path: readonly string[];
}

/** Parse known operators without pretending the client has their host fields. */
export function parseRosterQuery(query: string): ParsedRosterQuery {
  const freeTerms: string[] = [];
  const repo: string[] = [];
  const path: string[] = [];
  for (const token of query.trim().split(/\s+/u).filter((value) => value.length > 0)) {
    const operator = /^(repo|path):(.*)$/iu.exec(token);
    if (operator === null) {
      freeTerms.push(token);
    } else if (operator[1]?.toLowerCase() === 'repo') {
      repo.push(operator[2] ?? '');
    } else {
      path.push(operator[2] ?? '');
    }
  }
  return { freeTerms, repo, path };
}

export type SearchMatchKind = 'id' | 'label' | 'title' | 'agent' | 'model' | 'preview';

interface SearchField {
  readonly kind: SearchMatchKind;
  readonly value: string;
}

function ownSearchString(
  item: SessionCardDto,
  key: 'title' | 'agent' | 'model' | 'lastMessagePreview',
): string | null {
  if (!Object.prototype.hasOwnProperty.call(item, key)) return null;
  const value = item[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function visibleSearchFields(
  item: SessionCardDto,
  labels: ReadonlyMap<string, string>,
): readonly SearchField[] {
  const fields: SearchField[] = [
    { kind: 'id', value: item.id },
    { kind: 'id', value: compactId(item.id) },
  ];
  const label = labels.get(item.id);
  if (label !== undefined && label.length > 0) fields.push({ kind: 'label', value: label });
  const title = ownSearchString(item, 'title');
  if (title !== null) fields.push({ kind: 'title', value: title });
  const agent = ownSearchString(item, 'agent');
  if (agent !== null) fields.push({ kind: 'agent', value: agent });
  const model = ownSearchString(item, 'model');
  if (model !== null) fields.push({ kind: 'model', value: model });
  const lastMessagePreview = ownSearchString(item, 'lastMessagePreview');
  if (lastMessagePreview !== null) fields.push({ kind: 'preview', value: lastMessagePreview });
  if (Object.prototype.hasOwnProperty.call(item, 'previewMessages')) {
    const previews = item.previewMessages;
    if (Array.isArray(previews) && previews.every((entry) => typeof entry === 'string')) {
      for (const preview of previews) fields.push({ kind: 'preview', value: preview });
    }
  }
  return fields;
}

function scoreSearchTerm(term: string, fields: readonly SearchField[]): number | null {
  let best: number | null = null;
  for (const field of fields) {
    const score = scoreSubsequence(term, field.value);
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best;
}

function queryScore(
  item: SessionCardDto,
  parsed: ParsedRosterQuery,
  labels: ReadonlyMap<string, string>,
): number | null {
  const fields = visibleSearchFields(item, labels);
  let total = 0;
  for (const term of parsed.freeTerms) {
    const score = scoreSearchTerm(term, fields);
    if (score === null) return null;
    total += score;
  }
  return total;
}

/** Return the best subsequence score, or null when the term cannot be typed from the text. */
export function scoreSubsequence(needle: string, candidate: string): number | null {
  const normalizedNeedle = needle.trim().toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();
  if (normalizedNeedle.length === 0) return 0;
  let previousIndex = -1;
  let score = 0;
  for (const character of normalizedNeedle) {
    const index = normalizedCandidate.indexOf(character, previousIndex + 1);
    if (index === -1) return null;
    const gap = previousIndex === -1 ? index : index - previousIndex - 1;
    score += 1 - gap * 2;
    if (index === 0 || !/[a-z0-9]/iu.test(normalizedCandidate[index - 1] ?? '')) score += 5;
    previousIndex = index;
  }
  if (normalizedNeedle === normalizedCandidate) score += 20;
  return score;
}

/** Explain which visible field made a query match so preview hits stay explicit. */
export function searchMatchKind(
  item: SessionCardDto,
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): SearchMatchKind | null {
  const parsed = parseRosterQuery(query);
  if (parsed.freeTerms.length === 0 || queryScore(item, parsed, labels) === null) return null;
  const fields = visibleSearchFields(item, labels);
  const previewFields = fields.filter((field) => field.kind === 'preview');
  if (parsed.freeTerms.some((term) => scoreSearchTerm(term, previewFields) !== null)) {
    return 'preview';
  }
  for (const field of fields) {
    if (parsed.freeTerms.every((term) => scoreSubsequence(term, field.value) !== null)) {
      return field.kind;
    }
  }
  return 'id';
}

export function matchesClientHeldQuery(
  item: SessionCardDto,
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): boolean {
  const parsed = parseRosterQuery(query);
  return parsed.freeTerms.length === 0 || queryScore(item, parsed, labels) !== null;
}

export function sortBySearchRelevance(
  items: readonly SessionCardDto[],
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): readonly SessionCardDto[] {
  const parsed = parseRosterQuery(query);
  if (parsed.freeTerms.length === 0) return items;
  return items
    .map((item, index) => ({
      item,
      index,
      score: queryScore(item, parsed, labels) ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item);
}

export function filterRoster(
  items: readonly SessionCardDto[],
  filter: StatusFilter | null,
  query: string,
  labels: ReadonlyMap<string, string> = new Map(),
): readonly SessionCardDto[] {
  const filtered = items.filter((item) => {
    if (filter !== null && item.status !== filter) return false;
    return matchesClientHeldQuery(item, query, labels);
  });
  return sortBySearchRelevance(filtered, query, labels);
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
  query = '',
  labels: ReadonlyMap<string, string> = new Map(),
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
    const sorted = sortBySearchRelevance(sortByRecency(buckets[bucket]), query, labels);
    const visible = floatFavorites(sorted, favorites);
    return visible.length === 0 ? [] : [{ bucket, count: visible.length, items: visible }];
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
  const labels = input.labels ?? new Map();
  const filtered = filterRoster(items, input.filter, input.query, labels);
  const timeSections = buildTimeList(filtered, input.now, input.favorites, input.query, labels);
  const statusSections = buildStatusList(filtered, unreadById, input.query, labels).map((section) => ({
    ...section,
    items: floatFavorites(section.items, input.favorites),
    count: section.count,
  }));
  const smartItems = sortBySmart(filtered, input.now);
  return { items: filtered, smartItems, timeSections, statusSections };
}