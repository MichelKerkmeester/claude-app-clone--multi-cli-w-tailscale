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
    expect(screen.queryByText('No sessions found')).not.toBeInTheDocument();
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
