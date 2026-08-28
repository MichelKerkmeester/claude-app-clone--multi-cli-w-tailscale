// ───────────────────────────────────────────────────────────────────
// MODULE: Device Cleanup Queue Tests
// ───────────────────────────────────────────────────────────────────

// These tests exercise the persisted queue boundary and the authentication
// paths that add or remove work from it.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearDeviceCleanupQueue,
  deviceCleanupQueue,
  enqueueDeviceCleanup,
  rehydrateDeviceCleanupQueue,
  DEVICE_CLEANUP_STORAGE_KEY,
} from '../src/shared/state/device-cleanup-queue.js';
import { logoutDevice, revokeDevice } from '../src/shared/transport/auth.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  clearDeviceCleanupQueue();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  clearDeviceCleanupQueue();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('device cleanup queue', () => {
  it('persists an unconfirmed revoke and rehydrates it in a fresh module instance', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(revokeDevice()).rejects.toThrow('offline');
    expect(deviceCleanupQueue().pending).toEqual(['revoke']);
    expect(window.localStorage.getItem(DEVICE_CLEANUP_STORAGE_KEY)).toBe('["revoke"]');

    vi.resetModules();
    const freshQueue = await import('../src/shared/state/device-cleanup-queue.js');
    expect(freshQueue.rehydrateDeviceCleanupQueue().pending).toEqual(['revoke']);
  });

  it('keeps a queued action until a confirmed request clears it', async () => {
    expect(enqueueDeviceCleanup('logout')).toBe(true);
    expect(deviceCleanupQueue().pending).toEqual(['logout']);

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await logoutDevice();

    expect(deviceCleanupQueue().pending).toEqual([]);
    expect(window.localStorage.getItem(DEVICE_CLEANUP_STORAGE_KEY)).toBe('[]');
  });

  it('rehydrates a stored queue instead of trusting a previous in-memory value', () => {
    expect(enqueueDeviceCleanup('revoke')).toBe(true);
    window.localStorage.setItem(DEVICE_CLEANUP_STORAGE_KEY, '[]');

    expect(rehydrateDeviceCleanupQueue().pending).toEqual([]);
  });
});
