// ───────────────────────────────────────────────────────────────────
// MODULE: Settings Diagnostics Screen Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const relay = vi.hoisted(() => ({
  getRelayHeartbeat: vi.fn(),
}));

vi.mock('../src/shared/transport/relay.js', () => relay);

import Settings from '../src/pages/settings/screen-settings.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function diagnosticRow(id: string): HTMLElement {
  const row = document.querySelector(`[data-diagnostic="${id}"]`);
  if (!(row instanceof HTMLElement)) throw new Error(`Missing diagnostic row ${id}`);
  return row;
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  relay.getRelayHeartbeat.mockReturnValue({
    state: 'unknown',
    lastSeenAt: null,
    navigatorOnline: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('settings diagnostics', () => {
  it('streams each probe independently as its promise resolves', async () => {
    const connectivity = deferred<void>();
    const ping = deferred<void>();
    const hostCountCheck = vi.fn().mockResolvedValue(1);
    const connectivityProbe = vi.fn(() => connectivity.promise);
    const pingHost = vi.fn(() => ping.promise);

    render(Settings, {
      props: {
        hosts: ['host_alpha'],
        hostCountCheck,
        connectivityProbe,
        pingHost,
      },
    });

    await waitFor(() =>
      expect(diagnosticRow('host-count')).toHaveAttribute('data-status', 'passed'),
    );
    expect(screen.getByRole('heading', { name: 'Diagnostics' })).toBeInTheDocument();
    expect(diagnosticRow('connectivity')).toHaveAttribute('data-status', 'pending');
    expect(diagnosticRow('host-ping-0')).toHaveAttribute('data-status', 'pending');
    expect(within(diagnosticRow('host-count')).getByText('Passed')).toBeInTheDocument();

    ping.resolve();
    await waitFor(() =>
      expect(diagnosticRow('host-ping-0')).toHaveAttribute('data-status', 'passed'),
    );
    expect(diagnosticRow('connectivity')).toHaveAttribute('data-status', 'pending');

    connectivity.resolve();
    await waitFor(() =>
      expect(diagnosticRow('connectivity')).toHaveAttribute('data-status', 'passed'),
    );
    expect(hostCountCheck).toHaveBeenCalledOnce();
    expect(connectivityProbe).toHaveBeenCalledOnce();
    expect(pingHost).toHaveBeenCalledWith('host_alpha');
  });

  it('renders a rejected probe as Failed without reflecting the thrown message', async () => {
    const connectivityProbe = vi
      .fn()
      .mockRejectedValue(new Error('authorization token should never be shown'));

    render(Settings, {
      props: {
        hosts: ['host_alpha'],
        connectivityProbe,
        hostCountCheck: vi.fn().mockResolvedValue(1),
        pingHost: vi.fn().mockResolvedValue(undefined),
      },
    });

    const row = diagnosticRow('connectivity');
    await waitFor(() => expect(row).toHaveAttribute('data-status', 'failed'));
    expect(within(row).getByText('Failed')).toBeInTheDocument();
    expect(row).toHaveTextContent('The check failed. Try again.');
    expect(row).not.toHaveTextContent('authorization token should never be shown');
  });

  it('uses the relay heartbeat for the default connectivity and per-host checks', async () => {
    relay.getRelayHeartbeat.mockReturnValue({
      state: 'fresh',
      lastSeenAt: Date.now(),
      navigatorOnline: true,
    });

    render(Settings, { props: { hosts: ['host_alpha'] } });

    await waitFor(() =>
      expect(diagnosticRow('connectivity')).toHaveAttribute('data-status', 'passed'),
    );
    await waitFor(() =>
      expect(diagnosticRow('host-ping-0')).toHaveAttribute('data-status', 'passed'),
    );
    expect(relay.getRelayHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('does not invent host checks when host inventory capability is absent', () => {
    render(Settings, { props: { connectivityProbe: vi.fn().mockResolvedValue(undefined) } });

    expect(diagnosticRow('host-count')).toHaveAttribute('data-status', 'unavailable');
    expect(diagnosticRow('host-ping-unavailable')).toHaveAttribute('data-status', 'unavailable');
    expect(screen.getByText('Host inventory is not available on this client.')).toBeInTheDocument();
  });

  it('keeps relay and pairing guidance reachable from the diagnostics screen', () => {
    render(Settings, { props: { connectivityProbe: vi.fn().mockResolvedValue(undefined) } });

    expect(
      screen.getByRole('heading', { name: 'Reachable relay and pairing' }),
    ).toBeInTheDocument();
    expect(screen.getByText('How do I reach the relay?')).toBeInTheDocument();
    expect(screen.getByText('How do I pair this phone?')).toBeInTheDocument();
  });

  it('offers one-tap copying and confirms the copy result', async () => {
    const user = userEvent.setup();
    const copyDiagnostics = vi.fn().mockResolvedValue(true);
    render(Settings, { props: { copyDiagnostics } });

    await user.click(screen.getByRole('button', { name: 'Copy diagnostics' }));

    await waitFor(() => expect(copyDiagnostics).toHaveBeenCalledOnce());
    expect(screen.getByText('Diagnostics copied.')).toBeInTheDocument();
  });
});
