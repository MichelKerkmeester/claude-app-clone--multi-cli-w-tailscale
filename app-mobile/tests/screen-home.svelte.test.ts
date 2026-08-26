// ───────────────────────────────────────────────────────────────────
// MODULE: Home Screen List Behaviour Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
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

vi.mock('../src/shared/format/attention.js', () => attention);

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const OCCURRED_AT = '2026-08-13T10:00:00.000Z';

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: OCCURRED_AT,
    messageCount: 2,
    ...overrides,
  };
}

function roster(items: readonly SessionCardDto[], overrides: Partial<SessionListState> = {}): SessionListState {
  return {
    items,
    phase: 'ready',
    source: 'relay',
    updatedAt: OCCURRED_AT,
    error: null,
    ...overrides,
  };
}

function renderHome(
  items: readonly SessionCardDto[],
  extras: {
    onSelect?: ReturnType<typeof vi.fn>;
    onRefresh?: () => Promise<void>;
    connection?: 'live' | 'connecting' | 'error';
    cacheItems?: readonly SessionCardDto[];
    sessions?: SessionListState;
    hosts?: readonly string[];
  } = {},
) {
  const onSelect = extras.onSelect ?? vi.fn();
  render(Home, {
    props: {
      sessions: extras.sessions ?? roster(items),
      connection: extras.connection ?? 'live',
      cache:
        extras.cacheItems === undefined
          ? null
          : { sessions: extras.cacheItems, savedAt: OCCURRED_AT, transcripts: [] },
      device: { deviceId: 'device_web_001', hostFingerprint: 'host_web_001' },
      hosts: extras.hosts,
      onSelect,
      onRevoke: vi.fn(),
      onLogout: vi.fn(),
      onRefresh: extras.onRefresh,
    },
  });
  return { onSelect };
}

function section(bucket: string): HTMLElement {
  const node = document.querySelector(`[data-status-section="${bucket}"]`);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`Missing status section ${bucket}`);
  }
  return node;
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

describe('home roster list behaviour', () => {
  it('renders always-present status sections with fail-closed empty Unread and Attention', async () => {
    renderHome([
      card('session_run_001', { status: 'running' }),
      card('session_idle_001', { status: 'idle' }),
    ]);
    expect(section('attention')).toBeInTheDocument();
    expect(section('unread')).toBeInTheDocument();
    expect(section('working')).toBeInTheDocument();
    expect(section('idle')).toBeInTheDocument();
    expect(section('unknown')).toBeInTheDocument();
    expect(section('attention').querySelector('[data-section-count="attention"]')?.textContent).toBe(
      '0',
    );
    expect(section('unread').querySelector('[data-section-count="unread"]')?.textContent).toBe('0');
    expect(within(section('working')).getByRole('button', { name: /session_run_001/i })).toBeInTheDocument();
    expect(within(section('unread')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(section('attention')).queryByRole('button')).not.toBeInTheDocument();
    await waitFor(() => expect(attention.fetchPushConfig).toHaveBeenCalled());
  });

  it('keeps a running card under Running even when an unread overlay exists', () => {
    window.localStorage.setItem(
      'pi-remote.session-unread',
      JSON.stringify(['session_run_001', 'session_idle_001']),
    );
    renderHome([
      card('session_run_001', { status: 'running' }),
      card('session_idle_001', { status: 'idle' }),
    ]);
    expect(
      within(section('working')).getByRole('button', { name: /session_run_001/i }),
    ).toBeInTheDocument();
    expect(within(section('unread')).queryByRole('button')).not.toBeInTheDocument();
    expect(section('unread').querySelector('[data-section-count="unread"]')?.textContent).toBe('0');
  });

  it('keeps last-good rows and shows Stale when refresh rejects', async () => {
    const user = userEvent.setup();
    renderHome([card('session_keep_001', { status: 'running' })], {
      onRefresh: async () => {
        throw new Error('relay down');
      },
    });
    expect(screen.getByRole('button', { name: /session_keep_001/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh sessions' }));
    expect(screen.getByRole('button', { name: /session_keep_001/i })).toBeInTheDocument();
    expect(screen.getByText(/Stale, input disabled/i)).toBeInTheDocument();
  });

  it('disables sibling Opens while one launch is in flight', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderHome([
      card('session_one_001', { status: 'running' }),
      card('session_two_001', { status: 'idle' }),
    ]);
    const first = screen.getByRole('button', { name: /session_one_001/i });
    const second = screen.getByRole('button', { name: /session_two_001/i });
    await user.click(first);
    expect(onSelect).toHaveBeenCalledWith('session_one_001');
    expect(first).toBeDisabled();
    expect(second).toBeDisabled();
    expect(first).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps a failed empty fetch distinct from no sessions', () => {
    renderHome([], {
      sessions: roster([], { phase: 'error', error: 'The relay request failed.', source: 'none' }),
    });
    expect(screen.getByRole('heading', { name: 'Catalog unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('No sessions here')).not.toBeInTheDocument();
  });

  it('fills the resume slot from cache and keeps it inert until live', () => {
    renderHome([], {
      connection: 'connecting',
      cacheItems: [card('session_resume_001', { status: 'idle' })],
      sessions: roster([], { phase: 'loading', source: 'none' }),
    });
    const resume = document.querySelector('[data-resume-slot="true"]');
    expect(resume).not.toBeNull();
    const open = within(resume as HTMLElement).getByRole('button', { name: /session_resume_001/i });
    expect(open).toBeDisabled();
  });

  it('never renders an absent clock as just now', () => {
    renderHome([card('session_clock_001', { status: 'idle', updatedAt: 'not-a-date' })]);
    expect(screen.getByText(/unknown time/i)).toBeInTheDocument();
    expect(screen.queryByText(/just now/i)).not.toBeInTheDocument();
  });
});

describe('home roster list organization', () => {
  it('sections recency grouping into time buckets with counts', async () => {
    window.localStorage.setItem('pi-remote.roster-grouping', 'recency');
    const now = Date.now();
    const user = userEvent.setup();
    renderHome([
      card('session_run_now', {
        status: 'running',
        updatedAt: new Date(now - 5 * 60_000).toISOString(),
      }),
      card('session_idle_old', {
        status: 'idle',
        updatedAt: new Date(now - 10 * 24 * 60 * 60_000).toISOString(),
      }),
    ]);
    expect(document.querySelector('[data-time-section="active"]')).not.toBeNull();
    expect(document.querySelector('[data-time-section="older"]')).not.toBeNull();
    expect(document.querySelector('[data-time-count="active"]')?.textContent).toBe('1');
    expect(document.querySelector('[data-time-count="older"]')?.textContent).toBe('1');
    expect(document.querySelector('[data-time-section="today"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Status' }));
    expect(section('working')).toBeInTheDocument();
  });

  it('filters the roster with status chips over existing status', async () => {
    const user = userEvent.setup();
    renderHome([
      card('session_run_001', { status: 'running' }),
      card('session_idle_001', { status: 'idle' }),
      card('session_int_001', { status: 'interrupted' }),
    ]);
    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByRole('button', { name: /session_run_001/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /session_idle_001/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /session_int_001/i })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Status filter' })).toBeInTheDocument();
  });

  it('shows no sessions here when the catalog is empty', () => {
    renderHome([], {
      sessions: roster([], { phase: 'ready', source: 'relay' }),
    });
    expect(screen.getByRole('heading', { name: 'No sessions here' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No sessions match' })).not.toBeInTheDocument();
  });

  it('shows no sessions match when a query filters every row', async () => {
    const user = userEvent.setup();
    renderHome([card('session_idle_001', { status: 'idle' })]);
    const search = screen.getByRole('searchbox', { name: 'Search session ids on this device' });
    await user.type(search, 'does-not-match');
    expect(screen.getByRole('heading', { name: 'No sessions match' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No sessions here' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /session_idle_001/i })).not.toBeInTheDocument();
  });

  it('surfaces favorites unavailable when the store cannot be read', () => {
    const original = window.localStorage.getItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
      if (String(key) === 'pi-remote.session-favorite') throw new Error('quota');
      return original(key);
    });
    renderHome([card('session_idle_001', { status: 'idle' })]);
    expect(screen.getByText('Favorites unavailable')).toBeInTheDocument();
    const pin = document.querySelector('[data-favorite-id="session_idle_001"]');
    expect(pin).toBeDisabled();
  });

  it('reorders a pinned card to the front of its section', async () => {
    window.localStorage.setItem('pi-remote.roster-grouping', 'recency');
    const now = Date.now();
    const user = userEvent.setup();
    renderHome([
      card('session_newer', {
        status: 'idle',
        updatedAt: new Date(now - 10 * 24 * 60 * 60_000).toISOString(),
      }),
      card('session_older_pin', {
        status: 'idle',
        updatedAt: new Date(now - 20 * 24 * 60 * 60_000).toISOString(),
      }),
    ]);
    const olderSection = document.querySelector('[data-time-section="older"]');
    expect(olderSection).not.toBeNull();
    const before = [...(olderSection as HTMLElement).querySelectorAll('[data-session-id]')].map(
      (node) => node.getAttribute('data-session-id'),
    );
    expect(before[0]).toBe('session_newer');
    const pin = document.querySelector('[data-favorite-id="session_older_pin"]');
    expect(pin).not.toBeNull();
    await user.click(pin as HTMLElement);
    const after = [...(olderSection as HTMLElement).querySelectorAll('[data-session-id]')].map(
      (node) => node.getAttribute('data-session-id'),
    );
    expect(after[0]).toBe('session_older_pin');
    expect(after).toEqual(['session_older_pin', 'session_newer']);
  });

  it('keeps New session present, disabled until live, and never creating', async () => {
    const user = userEvent.setup();
    renderHome([card('session_idle_001', { status: 'idle' })], { connection: 'connecting' });
    const create = screen.getByRole('button', { name: 'New session' });
    expect(create).toBeDisabled();
    expect(screen.getByText(/unavailable until the host can create one/i)).toBeInTheDocument();
    await user.click(create);
    expect(screen.getByRole('button', { name: /session_idle_001/i })).toBeInTheDocument();
  });

  it('enables New session when live but still does not create', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderHome([card('session_idle_001', { status: 'idle' })], {
      connection: 'live',
      hosts: ['host_aaa', 'host_bbb'],
    });
    const create = screen.getByRole('button', { name: 'New session' });
    expect(create).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Host for a new session' })).toBeInTheDocument();
    await user.click(create);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
