// ───────────────────────────────────────────────────────────────────
// MODULE: Home Roster Feature Tests
// ───────────────────────────────────────────────────────────────────

// Pure roster tests cover host-backed search fields, the device-local query
// parser, smart ordering, and the collapsible-section safety rule.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  filterRoster,
  forceExpandSections,
  matchesClientHeldQuery,
  parseRosterQuery,
  scoreSubsequence,
  searchMatchKind,
  smartClass,
  sortBySmart,
  SMART_STALE_MS,
  type CollapsibleSectionState,
} from '../src/pages/home/session-list-seams.js';

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
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('smart roster ordering', () => {
  it('orders needs-you, freshly done, working, and idle or stale cards', () => {
    const sessions = [
      card('stale-idle', {
        status: 'idle',
        updatedAt: new Date(NOW - 2 * 60 * 60_000).toISOString(),
      }),
      card('working', {
        status: 'running',
        updatedAt: new Date(NOW - 2 * 60_000).toISOString(),
      }),
      card('fresh-done', {
        status: 'idle',
        updatedAt: new Date(NOW - 60_000).toISOString(),
      }),
      card('needs-you', {
        status: 'interrupted',
        updatedAt: new Date(NOW - 24 * 60 * 60_000).toISOString(),
      }),
    ];

    expect(sortBySmart(sessions, NOW).map((item) => item.id)).toEqual([
      'needs-you',
      'fresh-done',
      'working',
      'stale-idle',
    ]);
  });

  it('treats blocked or waiting as needs-you and keeps done above working', () => {
    expect(smartClass(card('blocked', { attention: 'blocked' }), NOW)).toBe('needs-you');
    expect(
      smartClass(
        card('done', {
          attention: 'done',
          updatedAt: new Date(NOW - 60_000).toISOString(),
        }),
        NOW,
      ),
    ).toBe('done-but-not-stale');
    expect(
      smartClass(
        card('running-flagged', {
          status: 'running',
          attention: 'done',
          updatedAt: new Date(NOW - 60_000).toISOString(),
        }),
        NOW,
      ),
    ).toBe('working');
  });

  it('uses the stale boundary and fails closed for an invalid clock', () => {
    expect(
      smartClass(
        card('fresh-boundary', {
          status: 'idle',
          updatedAt: new Date(NOW - SMART_STALE_MS + 1).toISOString(),
        }),
        NOW,
      ),
    ).toBe('done-but-not-stale');
    expect(
      smartClass(
        card('stale-boundary', {
          status: 'idle',
          updatedAt: new Date(NOW - SMART_STALE_MS).toISOString(),
        }),
        NOW,
      ),
    ).toBe('idle/stale');
    expect(smartClass(card('unknown-clock', { updatedAt: 'not-a-date' }), NOW)).toBe('idle/stale');
  });
});

describe('query parsing and matching', () => {
  it('parses supported operators while preserving free terms', () => {
    expect(parseRosterQuery('repo:mobile path:src Claude')).toEqual({
      freeTerms: ['Claude'],
      repo: ['mobile'],
      path: ['src'],
    });
  });

  it('matches free terms against title, agent, and model', () => {
    const title = card('title', { title: 'Weekly planning' });
    const agent = card('agent', { agent: 'Claude' });
    const model = card('model', { model: 'Opus', contextPercent: 50 });

    expect(filterRoster([title, agent, model], null, 'planning').map((item) => item.id)).toEqual([
      'title',
    ]);
    expect(filterRoster([title, agent, model], null, 'claude').map((item) => item.id)).toEqual([
      'agent',
    ]);
    expect(filterRoster([title, agent, model], null, 'opus').map((item) => item.id)).toEqual([
      'model',
    ]);
  });

  it('keeps repo and path operators inert while their host fields are absent', () => {
    const sessions = [card('first'), card('second')];
    expect(filterRoster(sessions, null, 'repo:mobile')).toEqual(sessions);
    expect(filterRoster(sessions, null, 'path:src')).toEqual(sessions);
    expect(filterRoster(sessions, null, 'repo:mobile path:src')).toEqual(sessions);
  });

  it('searches only rendered preview fields and identifies their match honestly', () => {
    const preview = card('preview', {
      lastMessagePreview: 'Visible last line',
      previewMessages: ['Visible first line'],
    });
    const hidden = Object.assign(card('hidden'), { transcript: 'private hidden text' }) as SessionCardDto;

    expect(matchesClientHeldQuery(preview, 'last')).toBe(true);
    expect(matchesClientHeldQuery(preview, 'first')).toBe(true);
    expect(searchMatchKind(preview, 'last')).toBe('preview');
    expect(searchMatchKind(preview, 'first')).toBe('preview');
    expect(filterRoster([hidden], null, 'private hidden text')).toEqual([]);
  });
});

describe('fuzzy search ranking', () => {
  it('ranks claude above a weaker subsequence for clde', () => {
    const strong = card('strong', { title: 'claude' });
    const weak = card('weak', { title: 'cxxxxx lxxxxx dxxxxx e' });
    const ranked = filterRoster([weak, strong], null, 'clde');

    expect(ranked.map((item) => item.id)).toEqual(['strong', 'weak']);
    expect(scoreSubsequence('clde', 'claude')).toBeGreaterThan(
      scoreSubsequence('clde', 'cxxxxx lxxxxx dxxxxx e'),
    );
  });

  it('applies boundary and full-match bonuses at the scoring boundaries', () => {
    expect(scoreSubsequence('', 'anything')).toBe(0);
    expect(scoreSubsequence('clde', 'claude')).not.toBeNull();
    expect(scoreSubsequence('claude', 'claude')).toBeGreaterThan(
      scoreSubsequence('clde', 'claude'),
    );
    expect(scoreSubsequence('xyz', 'claude')).toBeNull();
    expect(scoreSubsequence('clde', 'claude code')).toBeGreaterThan(
      scoreSubsequence('clde', 'incloude'),
    );
  });
});

describe('collapsible section safety', () => {
  it('force-expands only collapsible sections while filtering', () => {
    const sections: readonly CollapsibleSectionState[] = [
      { key: 'collapsed', collapsible: true, open: false },
      { key: 'open', collapsible: true, open: true },
      { key: 'static', collapsible: false, open: false },
    ];

    expect(forceExpandSections(sections, true)).toEqual([
      { key: 'collapsed', collapsible: true, open: true },
      { key: 'open', collapsible: true, open: true },
      { key: 'static', collapsible: false, open: false },
    ]);
    expect(forceExpandSections(sections, false)).toEqual(sections);
    expect(forceExpandSections([], true)).toEqual([]);
  });
});
