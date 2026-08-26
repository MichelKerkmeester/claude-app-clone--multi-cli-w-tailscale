// ───────────────────────────────────────────────────────────────────
// MODULE: Home Route Refresh Wiring Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  connectionReducer,
  sessionListReducer,
  type ConnectionAction,
  type SessionListAction,
} from '../src/shared/state/state.js';
import Page from '../src/routes/+page.svelte';

const attention = vi.hoisted(() => ({
  fetchAttention: vi.fn(),
  fetchPushConfig: vi.fn(),
  openAttentionHint: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  updatePushPreferences: vi.fn(),
  setPushForeground: vi.fn(),
}));

const relay = vi.hoisted(() => ({
  fetchSessions: vi.fn(),
}));

const OCCURRED_AT = '2026-08-13T10:00:00.000Z';

function card(id: string): SessionCardDto {
  return {
    id,
    status: 'running',
    updatedAt: OCCURRED_AT,
    messageCount: 2,
  };
}

const shell = vi.hoisted(() => {
  const keep = {
    id: 'session_keep_001',
    status: 'running' as const,
    updatedAt: '2026-08-13T10:00:00.000Z',
    messageCount: 2,
  };
  return {
    app: {
      sessions: {
        items: [keep],
        phase: 'ready' as const,
        source: 'relay' as const,
        updatedAt: '2026-08-13T10:00:00.000Z',
        error: null,
      },
      connection: {
        phase: 'live' as const,
        changedAt: '2026-08-13T10:00:00.000Z',
        lastMessageAt: '2026-08-13T10:00:00.000Z',
        detail: null,
      },
      initialCache: null,
      device: { deviceId: 'device_web_001', hostFingerprint: 'host_web_001' },
      dispatchSessions: vi.fn(),
      dispatchConnection: vi.fn(),
    },
    actions: {
      navigate: vi.fn(),
      openReview: vi.fn(),
      openInbox: vi.fn(),
      onRevoke: vi.fn(),
      onLogout: vi.fn(),
    },
  };
});

vi.mock('../src/shared/format/attention.js', () => attention);
vi.mock('../src/shared/transport/relay.js', () => relay);
vi.mock('../src/shared/state/app-state.svelte.js', () => ({
  getAppState: () => shell.app,
  getAppActions: () => shell.actions,
}));

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  shell.app.sessions = {
    items: [card('session_keep_001')],
    phase: 'ready',
    source: 'relay',
    updatedAt: OCCURRED_AT,
    error: null,
  };
  shell.app.connection = {
    phase: 'live',
    changedAt: OCCURRED_AT,
    lastMessageAt: OCCURRED_AT,
    detail: null,
  };
  shell.app.dispatchSessions.mockImplementation((action: SessionListAction) => {
    shell.app.sessions = sessionListReducer(shell.app.sessions, action);
  });
  shell.app.dispatchConnection.mockImplementation((action: ConnectionAction) => {
    shell.app.connection = connectionReducer(shell.app.connection, action);
  });
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
  relay.fetchSessions.mockReset();
  relay.fetchSessions.mockRejectedValue(new Error('relay down'));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('home route refresh wiring', () => {
  it('does not flip connection.phase when the real onRefresh fetch rejects', async () => {
    const user = userEvent.setup();
    render(Page);
    expect(screen.getByRole('button', { name: /session_keep_001/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh sessions' }));
    await waitFor(() => expect(relay.fetchSessions).toHaveBeenCalled());
    expect(shell.app.connection.phase).toBe('live');
    expect(shell.app.connection.phase).not.toBe('error');
    expect(shell.app.connection.phase).not.toBe('offline');
    const connectionTypes = shell.app.dispatchConnection.mock.calls.map(
      (call) => (call[0] as ConnectionAction).type,
    );
    expect(connectionTypes).not.toContain('error');
    expect(connectionTypes).not.toContain('offline');
    expect(screen.getByRole('button', { name: /session_keep_001/i })).toBeInTheDocument();
    expect(screen.getByText(/Stale, input disabled/i)).toBeInTheDocument();
  });
});
