// ───────────────────────────────────────────────────────────────────
// MODULE: Home Device Cleanup Tests
// ───────────────────────────────────────────────────────────────────

// The Home surface must expose persisted unfinished work and only dismiss
// it after the retry callback provides a successful promise.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/home/screen-home.svelte';
import type { SessionListState } from '../src/shared/state/state.js';
import {
  clearDeviceCleanupQueue,
  DEVICE_CLEANUP_STORAGE_KEY,
} from '../src/shared/state/device-cleanup-queue.js';

const attention = vi.hoisted(() => ({
  fetchPushConfig: vi.fn(),
}));

vi.mock('../src/shared/format/attention.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/format/attention.js')>()),
  ...attention,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-13T10:00:00.000Z';

function roster(): SessionListState {
  const item: SessionCardDto = {
    id: 'cleanup-session',
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 1,
  };
  return {
    items: [item],
    phase: 'ready',
    source: 'relay',
    updatedAt: UPDATED_AT,
    error: null,
  };
}

function renderHome(onRevoke: () => void | Promise<void>) {
  render(Home, {
    props: {
      sessions: roster(),
      connection: 'live',
      cache: null,
      device: { deviceId: 'device_cleanup', hostFingerprint: 'host_cleanup' },
      onSelect: vi.fn(),
      onRevoke,
      onLogout: vi.fn(),
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  clearDeviceCleanupQueue();
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
});

afterEach(() => {
  cleanup();
  clearDeviceCleanupQueue();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('home device cleanup recovery', () => {
  it('rehydrates a persisted unfinished removal and shows Retry', () => {
    window.localStorage.setItem(DEVICE_CLEANUP_STORAGE_KEY, '["revoke"]');

    renderHome(vi.fn());

    expect(screen.getByText('Device removal is unfinished.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('keeps the card when retry does not return confirmation', async () => {
    const onRevoke = vi.fn();
    window.localStorage.setItem(DEVICE_CLEANUP_STORAGE_KEY, '["revoke"]');
    renderHome(onRevoke);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRevoke).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Device removal is unfinished.')).toBeInTheDocument();
    expect(window.localStorage.getItem(DEVICE_CLEANUP_STORAGE_KEY)).toBe('["revoke"]');
  });

  it('clears the card only after Retry resolves successfully', async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    window.localStorage.setItem(DEVICE_CLEANUP_STORAGE_KEY, '["revoke"]');
    renderHome(onRevoke);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.queryByText('Device removal is unfinished.')).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(DEVICE_CLEANUP_STORAGE_KEY)).toBe('[]');
  });

  it('keeps the card and reports a rejected Retry', async () => {
    const onRevoke = vi.fn().mockRejectedValue(new Error('still offline'));
    window.localStorage.setItem(DEVICE_CLEANUP_STORAGE_KEY, '["revoke"]');
    renderHome(onRevoke);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('still offline')).toBeInTheDocument());
    expect(screen.getByText('Device removal is unfinished.')).toBeInTheDocument();
    expect(window.localStorage.getItem(DEVICE_CLEANUP_STORAGE_KEY)).toBe('["revoke"]');
  });
});
