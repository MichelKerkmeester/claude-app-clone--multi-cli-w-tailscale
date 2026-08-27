// ───────────────────────────────────────────────────────────────────
// MODULE: Race-timeout Helper Tests
// ───────────────────────────────────────────────────────────────────

// Proves that a hung open/reconnect/enroll promise rejects after the
// timeout and tears down via the dispose callback; that a close signal
// also rejects and disposes; and that a successful promise resolves
// without calling dispose.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  raceWithTimeout,
  RaceTimeoutError,
  DEFAULT_RACE_TIMEOUT_MS,
} from '../src/shared/state/race-timeout.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('raceWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the promise value when the promise wins before the timeout', async () => {
    const promise = Promise.resolve('ok');
    const result = await raceWithTimeout(promise, { timeoutMs: 60_000 });
    expect(result).toBe('ok');
  });

  it('rejects with the promise error when the promise rejects before the timeout', async () => {
    const promise = Promise.reject(new Error('network error'));
    await expect(raceWithTimeout(promise, { timeoutMs: 60_000 })).rejects.toThrow('network error');
  });

  it('rejects with RaceTimeoutError when the timeout elapses before the promise settles', async () => {
    const promise = new Promise<string>(() => {
      /* never settles */
    });
    const race = raceWithTimeout(promise, { timeoutMs: 10_000 });

    vi.advanceTimersByTime(10_000);

    await expect(race).rejects.toThrow(RaceTimeoutError);
    await expect(race).rejects.toHaveProperty('code', 'timed-out');
  });

  it('calls the dispose callback on timeout', async () => {
    const dispose = vi.fn();
    const promise = new Promise<string>(() => {
      /* never settles */
    });
    const race = raceWithTimeout(promise, { timeoutMs: 5_000, dispose });

    vi.advanceTimersByTime(5_000);

    await expect(race).rejects.toThrow(RaceTimeoutError);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('does not call dispose on successful resolution', async () => {
    const dispose = vi.fn();
    const promise = Promise.resolve('ok');
    const result = await raceWithTimeout(promise, { timeoutMs: 60_000, dispose });
    expect(result).toBe('ok');
    expect(dispose).not.toHaveBeenCalled();
  });

  it('rejects with RaceTimeoutError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const promise = new Promise<string>(() => {
      /* never settles */
    });

    await expect(
      raceWithTimeout(promise, { signal: controller.signal, timeoutMs: 60_000 }),
    ).rejects.toThrow(RaceTimeoutError);
    await expect(
      raceWithTimeout(promise, { signal: controller.signal, timeoutMs: 60_000 }),
    ).rejects.toHaveProperty('code', 'aborted');
  });

  it('calls dispose when the signal is already aborted', async () => {
    const dispose = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const promise = new Promise<string>(() => {
      /* never settles */
    });

    await expect(
      raceWithTimeout(promise, { signal: controller.signal, timeoutMs: 60_000, dispose }),
    ).rejects.toThrow(RaceTimeoutError);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects with RaceTimeoutError when the signal aborts mid-flight', async () => {
    const controller = new AbortController();
    const dispose = vi.fn();
    const promise = new Promise<string>(() => {
      /* never settles */
    });
    const race = raceWithTimeout(promise, { signal: controller.signal, timeoutMs: 60_000, dispose });

    controller.abort();

    await expect(race).rejects.toThrow(RaceTimeoutError);
    await expect(race).rejects.toHaveProperty('code', 'aborted');
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('does not call dispose on a normal promise rejection', async () => {
    const dispose = vi.fn();
    const promise = Promise.reject(new Error('expected'));
    await expect(raceWithTimeout(promise, { timeoutMs: 60_000, dispose })).rejects.toThrow('expected');
    expect(dispose).not.toHaveBeenCalled();
  });

  it('uses the default timeout when none is provided', async () => {
    // A promise that never settles; the default timeout should fire
    const promise = new Promise<string>(() => {
      /* never settles */
    });
    const race = raceWithTimeout(promise);

    vi.advanceTimersByTime(DEFAULT_RACE_TIMEOUT_MS);

    await expect(race).rejects.toThrow(RaceTimeoutError);
  });

  it('rejects a hung socket open after the timeout and disposes the half-open socket', async () => {
    // A WebSocket stuck in CONNECTING never fires an open event, so the open
    // promise never settles; the race must reject and dispose the socket.
    const closed = vi.fn();
    const halfOpenSocket = { close: closed, readyState: 0 };
    const hungOpen = new Promise<typeof halfOpenSocket>(() => {
      /* never opens */
    });
    const race = raceWithTimeout(hungOpen, {
      timeoutMs: 5_000,
      dispose: () => halfOpenSocket.close(),
    });

    vi.advanceTimersByTime(5_000);

    await expect(race).rejects.toThrow(RaceTimeoutError);
    await expect(race).rejects.toHaveProperty('code', 'timed-out');
    expect(closed).toHaveBeenCalledTimes(1);
  });
});