// ───────────────────────────────────────────────────────────────────
// MODULE: Card Projection Seam Tests
// ───────────────────────────────────────────────────────────────────

// The card projection turns a SessionCardDto into a view model from
// existing fields only, and the stale decider decays a running card to an
// UNKNOWN presentation after 20 minutes of silence — never a fake
// "done" — while leaving `status` untouched. Optional host keys enrich
// only when they are own properties.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { resolveAttentionBadge } from '../src/shared/format/attention.js';
import {
  WORKING_STALE_MS,
  countAttentionSessions,
  decideStalePresentation,
  hasHostField,
  hasInlineEnrichment,
  hueFromId,
  projectSessionCard,
  shouldRenderCard,
} from '../src/shared/format/card-projection.js';
import { compactId } from '../src/shared/format/view-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T10:00:00.000Z';
const NOW = Date.parse(UPDATED_AT);

function card(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id: 'session_card_001',
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 3,
    ...overrides,
  };
}

function withHost(base: SessionCardDto, extra: Record<string, unknown>): SessionCardDto {
  return Object.assign({}, base, extra);
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('projectSessionCard', () => {
  it('relabels the count as messages over the existing field', () => {
    expect(projectSessionCard(card({ messageCount: 1 })).messageCountLabel).toBe('1 message');
    expect(projectSessionCard(card({ messageCount: 7 })).messageCountLabel).toBe('7 messages');
  });

  it('keeps the ISO datetime as the absolute tap-to-inspect value', () => {
    expect(projectSessionCard(card()).absoluteOnTap).toBe(UPDATED_AT);
  });

  it('marks a resting card without writing anything', () => {
    const source = card({ status: 'idle' });
    const projected = projectSessionCard(source);
    expect(projected.isRestingDone).toBe(true);
    expect(projected.isRecoverableEmpty).toBe(false);
    expect(source.status).toBe('idle');
  });

  it('projects a zero-message session as a recoverable marker, not a hidden card', () => {
    const projected = projectSessionCard(card({ messageCount: 0 }));
    expect(projected.isRecoverableEmpty).toBe(true);
    expect(projected.hideEmpty).toBe(false);
    expect(projected.messageCountLabel).toBe('No messages');
    expect(shouldRenderCard(card({ messageCount: 0 }))).toBe(true);
  });

  it('is a deterministic pure projection', () => {
    expect(projectSessionCard(card())).toEqual(projectSessionCard(card()));
  });

  it('uses compactId as the title when no host title is present', () => {
    const source = card({ id: 'session_title_fallback_001' });
    const projected = projectSessionCard(source);
    expect(hasHostField(source, 'title')).toBe(false);
    expect(projected.titleFromHost).toBe(false);
    expect(projected.title).toBe(compactId(source.id));
  });

  it('uses a present host title and never slices a prompt into a title', () => {
    const source = withHost(card({ id: 'session_title_host_001' }), {
      title: 'Ship the meter',
      prompt: 'Please rewrite the whole protocol preamble into a title',
    });
    const projected = projectSessionCard(source);
    expect(projected.titleFromHost).toBe(true);
    expect(projected.title).toBe('Ship the meter');
    expect(projected.title).not.toBe(projected.prompt);
    expect(projected.prompt).toBe('Please rewrite the whole protocol preamble into a title');
  });

  it('does not invent a title from a present prompt when title is absent', () => {
    const source = withHost(card({ id: 'session_no_slice_001' }), {
      prompt: 'A very long user prompt that must never become the card title',
    });
    const projected = projectSessionCard(source);
    expect(projected.titleFromHost).toBe(false);
    expect(projected.title).toBe(compactId(source.id));
    expect(projected.title).not.toContain('very long user prompt');
  });

  it('hides a zero-turn card only when a host resumable/queued field is present and empty', () => {
    const hidden = withHost(card({ messageCount: 0 }), { resumable: false, queuedMessageCount: 0 });
    const kept = withHost(card({ messageCount: 0 }), { resumable: true });
    expect(shouldRenderCard(hidden)).toBe(false);
    expect(shouldRenderCard(kept)).toBe(true);
    expect(shouldRenderCard(card({ messageCount: 0 }))).toBe(true);
  });
});

describe('optional host-field gate', () => {
  const keys = [
    'attention',
    'title',
    'lastMessagePreview',
    'agent',
    'contextPercent',
    'activity',
    'tool',
    'prompt',
    'model',
  ] as const;

  it('degrades to today\'s card when every enrichment key is absent', () => {
    const source = card();
    const projected = projectSessionCard(source);
    for (const key of keys) {
      expect(hasHostField(source, key)).toBe(false);
    }
    expect(projected.attentionBadge).toBeNull();
    expect(projected.lastMessagePreview).toBeNull();
    expect(projected.agent).toBeNull();
    expect(projected.contextPercent).toBeNull();
    expect(projected.activity).toBeNull();
    expect(projected.tool).toBeNull();
    expect(projected.prompt).toBeNull();
    expect(projected.model).toBeNull();
    expect(projected.titleFromHost).toBe(false);
    expect(hasInlineEnrichment(projected)).toBe(false);
  });

  it('renders each enrichment only when its host key is present', () => {
    const source = withHost(card({ status: 'idle' }), {
      attention: 'waiting',
      title: 'Named session',
      lastMessagePreview: 'Last line from the host',
      agent: 'Opus',
      contextPercent: 42,
      activity: 'npm test',
      tool: 'bash',
      prompt: 'Run the suite',
      model: 'opus-4',
    });
    const projected = projectSessionCard(source);
    expect(projected.attentionBadge).toEqual({ kind: 'permission', label: 'Permission' });
    expect(projected.title).toBe('Named session');
    expect(projected.lastMessagePreview).toBe('Last line from the host');
    expect(projected.agent).toBe('Opus');
    expect(projected.contextPercent).toBe(42);
    expect(projected.activity).toBe('npm test');
    expect(projected.tool).toBe('bash');
    expect(projected.prompt).toBe('Run the suite');
    expect(projected.model).toBe('opus-4');
    expect(hasInlineEnrichment(projected)).toBe(true);
  });

  it('uses the shared working badge before host attention', () => {
    const source = withHost(card({ status: 'running' }), { attention: 'waiting' });
    expect(projectSessionCard(source).attentionBadge).toEqual({ kind: 'working', label: 'Working' });
    expect(source.status).toBe('running');
  });

  it('omits the model chip when the context meter payload is absent', () => {
    const source = withHost(card(), { model: 'opus-4' });
    const projected = projectSessionCard(source);
    expect(projected.contextPercent).toBeNull();
    expect(projected.model).toBeNull();
  });
});

describe('countAttentionSessions', () => {
  it('counts permission, unread, and done signals without counting live work', () => {
    const permissionAndUnread = withHost(
      card({ id: 'permission_and_unread', status: 'idle' }),
      { attention: 'waiting' },
    );
    const cards = [
      withHost(card({ id: 'working', status: 'running' }), { attention: 'done' }),
      permissionAndUnread,
      card({ id: 'unread', status: 'idle' }),
      withHost(card({ id: 'done', status: 'idle' }), { attention: 'done' }),
      card({ id: 'ordinary', status: 'idle' }),
    ];

    expect(countAttentionSessions(cards, new Set(['permission_and_unread', 'unread']))).toBe(3);
  });
});

describe('resolveAttentionBadge', () => {
  it('uses working, permission, unread, then done precedence', () => {
    const done = withHost(card({ id: 'done_unread', status: 'idle' }), { attention: 'done' });
    const unread = new Set([done.id]);
    expect(resolveAttentionBadge({ ...done, status: 'running', attention: 'done' }, unread)).toEqual({
      kind: 'working',
      label: 'Working',
    });
    expect(resolveAttentionBadge({ ...done, attention: 'waiting' }, unread)).toEqual({
      kind: 'permission',
      label: 'Permission',
    });
    expect(resolveAttentionBadge(done, unread)).toEqual({ kind: 'unread', label: 'Unread' });
    expect(resolveAttentionBadge(done, new Set())).toEqual({ kind: 'done', label: 'Done' });
  });

  it('ignores inherited attention fields', () => {
    const source = Object.create({ attention: 'done' }) as SessionCardDto;
    Object.assign(source, card({ id: 'inherited_attention' }));
    expect(resolveAttentionBadge(source, new Set())).toBeNull();
  });
});

describe('decideStalePresentation', () => {
  it('keeps a fresh running card at fresh', () => {
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS - 1)).toBe(
      'fresh',
    );
  });

  it('decays a running card to stale-unknown at the 20-minute boundary', () => {
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS)).toBe(
      'stale-unknown',
    );
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS + 1)).toBe(
      'stale-unknown',
    );
  });

  it('never marks a finished card stale, whatever its age', () => {
    expect(decideStalePresentation('idle', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe('fresh');
    expect(decideStalePresentation('interrupted', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe(
      'fresh',
    );
    expect(decideStalePresentation('unknown', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe(
      'fresh',
    );
  });

  it('keeps an unparseable timestamp fresh (genuinely unknown, not celebrated)', () => {
    expect(decideStalePresentation('running', 'nonsense', NOW)).toBe('fresh');
  });

  it('never emits a status value from the stale look', () => {
    const source: SessionCardDto = card({ status: 'running' });
    const look = decideStalePresentation(source.status, source.updatedAt, NOW + WORKING_STALE_MS);
    expect(look).toBe('stale-unknown');
    expect(source.status).toBe('running');
    expect(Object.prototype.hasOwnProperty.call(look, 'status')).toBe(false);
  });
});

describe('hueFromId', () => {
  it('is deterministic for the same opaque id', () => {
    expect(hueFromId('session_hue_001')).toBe(hueFromId('session_hue_001'));
  });

  it('returns a hue in [0, 360) without leaking the id', () => {
    const hue = hueFromId('session_hue_secret_001');
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
    expect(String(hue)).not.toContain('session_hue_secret_001');
  });
});
