// ───────────────────────────────────────────────────────────────────
// MODULE: Home Search and Sort Interaction Tests
// ───────────────────────────────────────────────────────────────────

// The screen tests exercise the real home controls, section disclosure state,
// device-local grouping persistence, and the preview-match explanation.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/home/screen-home.svelte';
import type { SessionListState } from '../src/shared/state/state.js';

const attention = vi.hoisted(() => ({
  fetchAttention: vi.fn(),
  fetchPushConfig: vi.fn(),
  openAttentionHint: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  updatePushPreferences: vi.fn(),
  setPushForeground: vi.fn(),
}));

vi.mock('../src/shared/format/attention.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/format/attention.js')>()),
  ...attention,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = Date.now();
const UPDATED_AT = new Date(NOW - 60_000).toISOString();

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 2,
    ...overrides,
  };
}

function roster(items: readonly SessionCardDto[]): SessionListState {
  return {
    items,
    phase: 'ready',
    source: 'relay',
    updatedAt: UPDATED_AT,
    error: null,
  };
}

function renderHome(items: readonly SessionCardDto[]) {
  render(Home, {
    props: {
      sessions: roster(items),
      connection: 'live',
      cache: null,
      device: { deviceId: 'device_web_001', hostFingerprint: 'host_web_001' },
      onSelect: vi.fn(),
      onRevoke: vi.fn(),
      onLogout: vi.fn(),
    },
  });
}

function statusSection(bucket: string): HTMLElement {
  const node = document.querySelector(`[data-status-section="${bucket}"]`);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing status section ${bucket}`);
  return node;
}

function sessionIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-session-id]')]
    .map((node) => node.getAttribute('data-session-id'))
    .filter((id): id is string => id !== null);
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('home smart grouping', () => {
  it('renders all four smart classes with a just-finished session first', async () => {
    const user = userEvent.setup();
    renderHome([
      card('stale-idle', {
        status: 'idle',
        updatedAt: new Date(NOW - 2 * 60 * 60_000).toISOString(),
      }),
      card('working', {
        status: 'running',
        updatedAt: new Date(NOW - 2 * 60_000).toISOString(),
      }),
      card('just-finished', {
        status: 'idle',
        updatedAt: new Date(NOW - 30_000).toISOString(),
      }),
      card('needs-you', { status: 'interrupted', updatedAt: new Date(NOW - 24 * 60 * 60_000).toISOString() }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Smart' }));

    const smartSection = document.querySelector('[data-smart-section="true"]');
    expect(smartSection).toBeInstanceOf(HTMLElement);
    expect(sessionIds(smartSection as HTMLElement)).toEqual([
      'needs-you',
      'just-finished',
      'working',
      'stale-idle',
    ]);
    expect(window.localStorage.getItem('pi-remote.roster-grouping')).toBe('smart');
  });
});

describe('home filtering and disclosure', () => {
  it('reopens a collapsed section for a matching query but preserves collapse without a query', async () => {
    const user = userEvent.setup();
    renderHome([
      card('idle-match', { status: 'idle' }),
      card('running-other', { status: 'running' }),
    ]);

    const idle = statusSection('idle') as HTMLDetailsElement;
    expect(idle.open).toBe(true);
    const summary = idle.querySelector('summary');
    expect(summary).not.toBeNull();
    await user.click(summary as HTMLElement);
    expect(idle.open).toBe(false);
    expect(idle.querySelector('[data-session-id="idle-match"]')).not.toBeNull();

    const search = screen.getByRole('searchbox', { name: 'Search session ids on this device' });
    await user.type(search, 'idle-match');

    expect(idle.open).toBe(true);
    expect(screen.getByRole('button', { name: /idle-match/i })).toBeInTheDocument();

    await user.clear(search);
    expect(idle.open).toBe(false);
    expect(idle.querySelector('[data-session-id="idle-match"]')).not.toBeNull();
  });

  it('labels a card whose visible preview, rather than title, matched the search', async () => {
    const user = userEvent.setup();
    renderHome([
      card('preview-session', {
        title: 'Visible title',
        previewMessages: ['A visible needle in the preview'],
      }),
    ]);

    const search = screen.getByRole('searchbox', { name: 'Search session ids on this device' });
    await user.type(search, 'needle');

    expect(document.querySelector('[data-session-id="preview-session"]')).toBeInTheDocument();
    expect(screen.getByText('Matched in preview')).toBeInTheDocument();
  });
});
