// ───────────────────────────────────────────────────────────────────
// MODULE: Enrollment Screen Tests
// ───────────────────────────────────────────────────────────────────

// These tests use the real enrollment screen with only authentication I/O
// mocked, so the diagnostics and timeout branches are exercised in the DOM.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  enrollDevice: vi.fn(),
  establishSession: vi.fn(),
  scanQrImage: vi.fn(),
}));

vi.mock('../src/shared/transport/auth.js', () => auth);

import Enrollment, {
  FIRST_PAIR_TIMEOUT_MS,
} from '../src/pages/enrollment/screen-enrollment.svelte';
import {
  appendConnectionEvent,
  clearConnectionLog,
} from '../src/shared/transport/connection-log.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function renderEnrollment(onEnrolled = vi.fn()): void {
  render(Enrollment, {
    props: {
      phase: 'unenrolled',
      onEnrolled,
      onboardingGates: [],
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  clearConnectionLog();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('enrollment diagnostics', () => {
  it('renders persisted connection events on the first-pair surface', () => {
    appendConnectionEvent({
      at: '2026-01-01T00:00:00.000Z',
      kind: 'connection',
      status: 'failed',
      code: 'offline',
    });

    renderEnrollment();

    const log = screen.getByRole('list', { name: 'Recent connection events' });
    expect(log).toHaveTextContent('Connection · Failed');
    expect(log).toHaveTextContent('offline');
    expect(log).toHaveTextContent('2026-01-01T00:00:00.000Z');
  });

  it('fails visibly at the first-pair ceiling instead of staying pending', async () => {
    vi.useFakeTimers();
    auth.enrollDevice.mockImplementation(
      (_serializedQr: string, signal: AbortSignal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const onEnrolled = vi.fn();
    renderEnrollment(onEnrolled);

    const input = screen.getByRole('textbox', { name: 'Enrollment data' });
    fireEvent.input(input, { target: { value: '{"enrollment":"qr-data"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enroll device' }));
    expect(auth.enrollDevice).toHaveBeenCalledWith(
      '{"enrollment":"qr-data"}',
      expect.any(AbortSignal),
    );

    // Pin the ceiling itself. Advancing by the imported constant alone would
    // follow it wherever it moved, so a ceiling raised to an hour would still
    // pass here while the message below kept claiming 25 seconds.
    expect(FIRST_PAIR_TIMEOUT_MS).toBe(25_000);

    // Just short of the ceiling the surface must still be waiting, otherwise a
    // timeout that fired immediately would satisfy the assertions that follow.
    await vi.advanceTimersByTimeAsync(24_000);
    await tick();
    expect(screen.queryByRole('alert')).toBeNull();

    await vi.advanceTimersByTimeAsync(1_000);
    await tick();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Pairing timed out after 25 seconds. Check the connection log and try again.',
    );
    expect(screen.getByRole('list', { name: 'Recent connection events' })).toHaveTextContent(
      'timeout',
    );
    expect(onEnrolled).not.toHaveBeenCalled();
  });

  it('does not claim enrollment when session confirmation is absent', async () => {
    auth.enrollDevice.mockResolvedValue({ deviceId: 'device' });
    auth.establishSession.mockResolvedValue(null);
    const onEnrolled = vi.fn();
    renderEnrollment(onEnrolled);

    const input = screen.getByRole('textbox', { name: 'Enrollment data' });
    fireEvent.input(input, { target: { value: '{"enrollment":"qr-data"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enroll device' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enrollment did not produce a device session.',
    );
    expect(onEnrolled).not.toHaveBeenCalled();
  });
});
