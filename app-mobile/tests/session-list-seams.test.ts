// ───────────────────────────────────────────────────────────────────
// MODULE: Home Roster Seam Tests
// ───────────────────────────────────────────────────────────────────

// The roster seams are pure projections over SessionListState items plus a
// device-local unread bit. Each incremental seam (bucketing, dedup) is
// driven through an independent incremental harness and compared against a
// canonical full rebuild at every prefix; the boundary tests pin the
// fail-closed membership rules (running beats unread, live beats cache).

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  BUCKET_DISPLAY_ORDER,
  BUCKET_MEMBERSHIP_PRIORITY,
  bucketByStatus,
  buildStatusList,
  buildTimeList,
  dedupSessions,
  deriveListState,
  displayOrderIndex,
  filterRoster,
  floatFavorites,
  groupByTimeBucket,
  hostAttentionPresent,
  organize,
  recencySort,
  sessionStatusGroup,
  sessionTimeBucket,
  sortByRecency,
  timeBucket,
  type StatusBucket,
  type StatusBucketSection,
  type TimeBucketGroup,
} from '../src/pages/home/session-list-seams.js';
import { compactId } from '../src/shared/format/view-helpers.js';
import type { SessionListState } from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = Date.parse('2026-08-17T12:00:00.000Z');

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: '2026-08-17T11:00:00.000Z',
    messageCount: 2,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TIME BUCKETS AND RECENCY SORT
// ───────────────────────────────────────────────────────────────────

describe('time buckets', () => {
  it('assigns active / today / yesterday / older from the injected clock', () => {
    // Within the last hour.
    expect(timeBucket('2026-08-17T11:30:00.000Z', NOW)).toBe('active');
    // Same UTC day, older than an hour.
    expect(timeBucket('2026-08-17T09:00:00.000Z', NOW)).toBe('today');
    // Previous UTC day.
    expect(timeBucket('2026-08-16T12:00:00.000Z', NOW)).toBe('yesterday');
    // Anything before that.
    expect(timeBucket('2026-08-10T12:00:00.000Z', NOW)).toBe('older');
  });

  it('keeps an unparseable timestamp in the oldest bucket (unknown sorts last)', () => {
    expect(timeBucket('not-a-date', NOW)).toBe('older');
  });

  it('sorts by recency with the newest card first', () => {
    const sessions = [
      card('old', { updatedAt: '2026-08-15T00:00:00.000Z' }),
      card('new', { updatedAt: '2026-08-17T11:59:00.000Z' }),
      card('mid', { updatedAt: '2026-08-16T00:00:00.000Z' }),
    ];
    expect(recencySort(sessions).map((session) => session.id)).toEqual(['new', 'mid', 'old']);
  });

  it('groups into ordered, non-empty buckets', () => {
    const groups: readonly TimeBucketGroup[] = groupByTimeBucket(
      [
        card('old', { updatedAt: '2026-08-10T12:00:00.000Z' }),
        card('active', { updatedAt: '2026-08-17T11:30:00.000Z' }),
      ],
      NOW,
    );
    expect(groups.map((group) => group.bucket)).toEqual(['active', 'older']);
    expect(groups[0]?.sessions.map((session) => session.id)).toEqual(['active']);
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. STATUS MEMBERSHIP AND BUCKETS
// ───────────────────────────────────────────────────────────────────

describe('first-match membership precedence', () => {
  it('classifies a running-but-unread card as working, never unread', () => {
    expect(sessionStatusGroup('running', true)).toBe('working');
    expect(sessionStatusGroup('running', false)).toBe('working');
  });

  it('classifies an unread non-running card as unread', () => {
    expect(sessionStatusGroup('idle', true)).toBe('unread');
    expect(sessionStatusGroup('unknown', true)).toBe('unread');
  });

  it('keeps idle and unknown only when nothing higher matched', () => {
    expect(sessionStatusGroup('idle', false)).toBe('idle');
    expect(sessionStatusGroup('unknown', false)).toBe('unknown');
    expect(sessionStatusGroup('interrupted', true)).toBe('attention');
  });
});

describe('status bucketing', () => {
  it('always presents every section with a count derived by the same classifier', () => {
    const sections = bucketByStatus([
      card('run', { status: 'running' }),
      card('idle-1', { status: 'idle' }),
      card('idle-2', { status: 'idle' }),
      card('interrupted', { status: 'interrupted' }),
    ]);
    expect(sections).toEqual([
      { bucket: 'attention', count: 1 },
      { bucket: 'unread', count: 0 },
      { bucket: 'working', count: 1 },
      { bucket: 'idle', count: 2 },
      { bucket: 'unknown', count: 0 },
    ]);
  });

  it('counts device-local unread bits without turning them into host truth', () => {
    const sections = bucketByStatus(
      [card('run-unread', { status: 'running' }), card('idle-unread', { status: 'idle' })],
      new Set(['run-unread', 'idle-unread']),
    );
    const byBucket = new Map(sections.map((section) => [section.bucket, section.count]));
    expect(byBucket.get('working')).toBe(1);
    expect(byBucket.get('unread')).toBe(1);
    expect(byBucket.get('attention')).toBe(0);
  });
});

describe('the unread-aware bucket lattice', () => {
  it('keeps display order distinct from membership priority', () => {
    expect(BUCKET_DISPLAY_ORDER).toEqual([
      'attention',
      'unread',
      'working',
      'idle',
      'unknown',
    ]);
    expect(BUCKET_MEMBERSHIP_PRIORITY).toEqual([
      'attention',
      'working',
      'unread',
      'idle',
      'unknown',
    ]);
  });

  it('places a running card at working under both readings', () => {
    for (const unread of [false, true]) {
      expect(sessionStatusGroup('running', unread)).toBe('working');
    }
    // Display rank of working differs from its membership rank, so a running
    // card can never surface under the unread section.
    expect(displayOrderIndex('unread')).toBe(1);
    expect(displayOrderIndex('working')).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. DIFFERENTIAL: BUCKETING
// ───────────────────────────────────────────────────────────────────

class IncrementalCounter {
  private readonly counts: Record<StatusBucket, number> = {
    attention: 0,
    unread: 0,
    working: 0,
    idle: 0,
    unknown: 0,
  };

  add(session: SessionCardDto): void {
    const bucket = sessionStatusGroup(session.status, false);
    this.counts[bucket] += 1;
  }

  sections(): readonly StatusBucketSection[] {
    return BUCKET_DISPLAY_ORDER.map((bucket) => ({ bucket, count: this.counts[bucket] }));
  }
}

describe('differential: incremental bucketing equals a full rebuild', () => {
  const batches: readonly (readonly SessionCardDto[])[] = [
    [card('a', { status: 'running' }), card('b', { status: 'idle' })],
    [card('c', { status: 'running' })],
    [card('a', { status: 'idle' })],
    [card('d', { status: 'interrupted' }), card('e', { status: 'unknown' })],
  ];

  it('matches bucketByStatus at every prefix of the roster stream', () => {
    const counter = new IncrementalCounter();
    const accumulated: SessionCardDto[] = [];
    for (const batch of batches) {
      accumulated.push(...batch);
      for (const session of batch) counter.add(session);
      expect(counter.sections()).toEqual(bucketByStatus(accumulated));
    }
  });
});

// ───────────────────────────────────────────────────────────────────
// 6. SINGLE-OWNER DEDUP
// ───────────────────────────────────────────────────────────────────

describe('flattened-list single-owner dedup', () => {
  it('emits an id present in both cache and live exactly once, live winning', () => {
    const cached = card('dup', { status: 'idle', updatedAt: '2026-08-16T00:00:00.000Z' });
    const live = card('dup', { status: 'running', updatedAt: '2026-08-17T11:00:00.000Z' });
    const result = dedupSessions({ cacheItems: [cached, card('only-cache')], liveItems: [live] });
    expect(result.map((session) => session.id)).toEqual(['dup', 'only-cache']);
    expect(result[0]).toEqual(live);
  });

  it('keeps the first-seen position while updating the owned value', () => {
    const first = card('keep-position', { status: 'idle' });
    const later = card('keep-position', { status: 'running' });
    const result = dedupSessions({ cacheItems: [first], liveItems: [later, card('tail')] });
    expect(result.map((session) => session.id)).toEqual(['keep-position', 'tail']);
    expect(result[0]?.status).toBe('running');
  });
});

class IncrementalOwnerMap {
  private readonly owner = new Map<string, SessionCardDto>();

  addCached(items: readonly SessionCardDto[]): void {
    for (const item of items) this.owner.set(item.id, item);
  }

  addLive(items: readonly SessionCardDto[]): void {
    for (const item of items) this.owner.set(item.id, item);
  }

  values(): readonly SessionCardDto[] {
    return [...this.owner.values()];
  }
}

describe('differential: incremental single-owner dedup equals a full rebuild', () => {
  it('matches dedupSessions at every prefix of a cache → relay stream', () => {
    const cacheBatch = [card('s1', { status: 'idle' }), card('s2', { status: 'idle' })];
    const liveBatches: readonly (readonly SessionCardDto[])[] = [
      [card('s3', { status: 'running' }), card('s2', { status: 'running' })],
      [card('s1', { status: 'running' }), card('s4', { status: 'idle' })],
    ];
    const incremental = new IncrementalOwnerMap();
    incremental.addCached(cacheBatch);
    let accumulated: SessionCardDto[] = [...cacheBatch];
    expect(incremental.values()).toEqual(dedupSessions({ cacheItems: cacheBatch, liveItems: [] }));
    for (const batch of liveBatches) {
      incremental.addLive(batch);
      accumulated = [...accumulated, ...batch];
      expect(incremental.values()).toEqual(
        dedupSessions({ cacheItems: cacheBatch, liveItems: accumulated }),
      );
    }
  });
});

// ───────────────────────────────────────────────────────────────────
// 7. RECENCY SORT AND LIST STATE
// ───────────────────────────────────────────────────────────────────

function canonicalRecencySort(items: readonly SessionCardDto[]): readonly SessionCardDto[] {
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

describe('sortByRecency', () => {
  it('matches a canonical newest-first sort', () => {
    const sessions = [
      card('old', { updatedAt: '2026-08-15T00:00:00.000Z' }),
      card('new', { updatedAt: '2026-08-17T11:59:00.000Z' }),
      card('mid', { updatedAt: '2026-08-16T00:00:00.000Z' }),
    ];
    expect(sortByRecency(sessions).map((session) => session.id)).toEqual(
      canonicalRecencySort(sessions).map((session) => session.id),
    );
  });

  it('keeps a single item and an empty list unchanged', () => {
    expect(sortByRecency([])).toEqual([]);
    const only = [card('only')];
    expect(sortByRecency(only)).toEqual(only);
  });

  it('breaks equal clocks stably and sinks an absent clock last', () => {
    const equal = [
      card('first', { updatedAt: '2026-08-17T11:00:00.000Z' }),
      card('second', { updatedAt: '2026-08-17T11:00:00.000Z' }),
    ];
    expect(sortByRecency(equal).map((session) => session.id)).toEqual(['first', 'second']);
    const withUnknown = [
      card('missing', { updatedAt: 'not-a-date' }),
      card('known', { updatedAt: '2026-08-17T11:00:00.000Z' }),
    ];
    expect(sortByRecency(withUnknown).map((session) => session.id)).toEqual(['known', 'missing']);
  });
});

function listState(
  overrides: Partial<SessionListState> = {},
): SessionListState {
  return {
    items: [],
    phase: 'idle',
    source: 'none',
    updatedAt: null,
    error: null,
    ...overrides,
  };
}

describe('deriveListState', () => {
  it('keeps prior items while a refetch is in flight', () => {
    const items = [card('kept')];
    const view = deriveListState(
      listState({ items, phase: 'loading', source: 'relay' }),
      'connecting',
    );
    expect(view.kind).toBe('ready');
    expect(view.items).toEqual(items);
  });

  it('treats a failed empty fetch as unresolved, never no-sessions', () => {
    const view = deriveListState(
      listState({ phase: 'error', error: 'The relay request failed.' }),
      'error',
    );
    expect(view.kind).toBe('error-retry');
    expect(view.items).toEqual([]);
  });

  it('does not invent host-too-old when the relay has no capability signal', () => {
    const view = deriveListState(
      listState({ phase: 'error', error: 'The relay request failed.' }),
      'error',
    );
    expect(view.kind).not.toBe('host-too-old');
  });

  it('shows loading while the first catalog read is unresolved', () => {
    expect(deriveListState(listState({ phase: 'loading' }), 'connecting').kind).toBe('loading');
    expect(deriveListState(listState({ phase: 'idle' }), 'authenticating').kind).toBe('loading');
  });

  it('shows ready-empty only after the host answered with no rows', () => {
    const view = deriveListState(listState({ phase: 'ready', source: 'relay' }), 'live');
    expect(view.kind).toBe('ready');
    expect(view.items).toEqual([]);
  });
});

describe('buildStatusList', () => {
  it('always presents every section, including empty Unread and Attention', () => {
    const sections = buildStatusList([card('run', { status: 'running' })]);
    expect(sections.map((section) => section.bucket)).toEqual([
      'attention',
      'unread',
      'working',
      'idle',
      'unknown',
    ]);
    expect(sections.find((section) => section.bucket === 'unread')?.count).toBe(0);
    expect(sections.find((section) => section.bucket === 'attention')?.count).toBe(0);
  });

  it('keeps a running-but-unread card under Running and never double-lists it', () => {
    const sections = buildStatusList(
      [card('run-unread', { status: 'running' }), card('idle-unread', { status: 'idle' })],
      new Set(['run-unread', 'idle-unread']),
    );
    const byBucket = new Map(sections.map((section) => [section.bucket, section]));
    expect(byBucket.get('working')?.items.map((item) => item.id)).toEqual(['run-unread']);
    expect(byBucket.get('unread')?.items.map((item) => item.id)).toEqual(['idle-unread']);
    const ids = sections.flatMap((section) => section.items.map((item) => item.id));
    expect(ids).toEqual(['idle-unread', 'run-unread']);
  });

  it('derives each count from the same membership as the rows', () => {
    const sections = buildStatusList([
      card('run', { status: 'running' }),
      card('idle-1', { status: 'idle' }),
      card('idle-2', { status: 'idle' }),
      card('interrupted', { status: 'interrupted' }),
    ]);
    for (const section of sections) {
      expect(section.count).toBe(section.items.length);
    }
  });

  it('sorts a section newest-first and sinks an absent clock last', () => {
    const sections = buildStatusList([
      card('older', { status: 'idle', updatedAt: '2026-08-15T00:00:00.000Z' }),
      card('missing', { status: 'idle', updatedAt: 'not-a-date' }),
      card('newer', { status: 'idle', updatedAt: '2026-08-17T11:00:00.000Z' }),
    ]);
    const idle = sections.find((section) => section.bucket === 'idle');
    expect(idle?.items.map((item) => item.id)).toEqual(['newer', 'older', 'missing']);
  });

  it('does not treat current DTO cards as having a host attention field', () => {
    expect(hostAttentionPresent([card('idle')])).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────
// 8. ORGANIZE PIPELINE
// ───────────────────────────────────────────────────────────────────

function canonicalOrganize(
  items: readonly SessionCardDto[],
  input: {
    readonly filter: 'running' | 'idle' | 'interrupted' | null;
    readonly query: string;
    readonly favorites: ReadonlySet<string>;
    readonly now: number;
    readonly labels?: ReadonlyMap<string, string>;
  },
) {
  const needle = input.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (input.filter !== null && item.status !== input.filter) return false;
    if (needle.length === 0) return true;
    if (item.id.toLowerCase().includes(needle)) return true;
    if (compactId(item.id).toLowerCase().includes(needle)) return true;
    const label = input.labels?.get(item.id);
    return label !== undefined && label.toLowerCase().includes(needle);
  });
  const buckets: Record<'active' | 'today' | 'yesterday' | 'older', SessionCardDto[]> = {
    active: [],
    today: [],
    yesterday: [],
    older: [],
  };
  for (const item of filtered) {
    const bucket =
      item.status === 'running' ? 'active' : timeBucket(item.updatedAt, input.now);
    buckets[bucket].push(item);
  }
  const timeSections = (['active', 'today', 'yesterday', 'older'] as const).flatMap((bucket) => {
    const sorted = sortByRecency(buckets[bucket]);
    const pinned = sorted.filter((item) => input.favorites.has(item.id));
    const rest = sorted.filter((item) => !input.favorites.has(item.id));
    const sectionItems = [...pinned, ...rest];
    return sectionItems.length === 0
      ? []
      : [{ bucket, count: sectionItems.length, items: sectionItems }];
  });
  return { items: filtered, timeSections };
}

describe('sessionTimeBucket', () => {
  it('keeps a running card in Active even when its clock is old', () => {
    expect(
      sessionTimeBucket(card('run', { status: 'running', updatedAt: '2026-08-10T12:00:00.000Z' }), NOW),
    ).toBe('active');
  });
});

describe('organize pipeline', () => {
  const older = card('old-idle', { status: 'idle', updatedAt: '2026-08-10T12:00:00.000Z' });
  const today = card('today-idle', { status: 'idle', updatedAt: '2026-08-17T09:00:00.000Z' });
  const running = card('run-old', { status: 'running', updatedAt: '2026-08-10T12:00:00.000Z' });
  const interrupted = card('stuck', {
    status: 'interrupted',
    updatedAt: '2026-08-16T12:00:00.000Z',
  });

  it('matches a canonical bucket × filter × favorite composition', () => {
    const input = {
      filter: 'idle' as const,
      query: '',
      favorites: new Set(['old-idle']),
      now: NOW,
    };
    const items = [older, today, running, interrupted];
    const actual = organize(items, input);
    const expected = canonicalOrganize(items, input);
    expect(actual.items.map((item) => item.id)).toEqual(expected.items.map((item) => item.id));
    expect(actual.timeSections.map((section) => section.bucket)).toEqual(
      expected.timeSections.map((section) => section.bucket),
    );
    expect(
      actual.timeSections.map((section) => section.items.map((item) => item.id)),
    ).toEqual(expected.timeSections.map((section) => section.items.map((item) => item.id)));
  });

  it('omits empty time buckets and keeps section counts aligned with rows', () => {
    const sections = buildTimeList([running, older], NOW);
    expect(sections.map((section) => section.bucket)).toEqual(['active', 'older']);
    for (const section of sections) {
      expect(section.count).toBe(section.items.length);
    }
  });

  it('keeps an empty list, a single item, and an all-filtered list distinct', () => {
    expect(organize([], { filter: null, query: '', favorites: new Set(), now: NOW }).items).toEqual(
      [],
    );
    expect(
      organize([older], { filter: null, query: '', favorites: new Set(), now: NOW }).items.map(
        (item) => item.id,
      ),
    ).toEqual(['old-idle']);
    expect(
      organize([older, running], {
        filter: 'interrupted',
        query: '',
        favorites: new Set(),
        now: NOW,
      }).items,
    ).toEqual([]);
  });

  it('floats a favorite within its section and does not double-count it', () => {
    const newerOlder = card('older-newer', {
      status: 'idle',
      updatedAt: '2026-08-11T12:00:00.000Z',
    });
    const result = organize([older, newerOlder], {
      filter: null,
      query: '',
      favorites: new Set(['old-idle']),
      now: NOW,
    });
    const olderSection = result.timeSections.find((section) => section.bucket === 'older');
    expect(olderSection?.items.map((item) => item.id)).toEqual(['old-idle', 'older-newer']);
    expect(olderSection?.count).toBe(2);
  });

  it('filters over existing status and composes with a client-held id query', () => {
    expect(filterRoster([older, running, interrupted], 'running', '', new Map()).map((item) => item.id)).toEqual(
      ['run-old'],
    );
    const queried = organize([older, running], {
      filter: null,
      query: 'run-old',
      favorites: new Set(),
      now: NOW,
    });
    expect(queried.items.map((item) => item.id)).toEqual(['run-old']);
  });

  it('does not match a synthesized title that the client does not hold', () => {
    const result = organize([older], {
      filter: null,
      query: 'Weekly planning',
      favorites: new Set(),
      now: NOW,
    });
    expect(result.items).toEqual([]);
  });

  it('matches a device-local label without inventing a host title', () => {
    const labels = new Map([['old-idle', 'desk pin']]);
    const result = organize([older, running], {
      filter: null,
      query: 'desk pin',
      favorites: new Set(),
      now: NOW,
      labels,
    });
    expect(result.items.map((item) => item.id)).toEqual(['old-idle']);
  });
});

describe('floatFavorites', () => {
  it('preserves recency inside the pinned group and the unpinned group', () => {
    const first = card('a', { updatedAt: '2026-08-17T11:00:00.000Z' });
    const second = card('b', { updatedAt: '2026-08-17T10:00:00.000Z' });
    const third = card('c', { updatedAt: '2026-08-17T09:00:00.000Z' });
    const sorted = sortByRecency([third, first, second]);
    expect(floatFavorites(sorted, new Set(['c', 'a'])).map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });
});