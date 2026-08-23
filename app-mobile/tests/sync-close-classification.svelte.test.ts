// ───────────────────────────────────────────────────────────────────
// MODULE: Sync Socket Close Classification Tests
// ───────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SyncMessage } from '@pi-remote/pi-rpc-protocol';

const relay = vi.hoisted(() => ({
  fetchTranscript: vi.fn(),
  noteRelayHeartbeat: vi.fn(),
  openSyncSocket: vi.fn(),
}));

vi.mock('../src/shared/transport/relay.js', () => relay);

import { useSyncSocket } from '../src/shared/transport/use-sync-socket.svelte.js';
import {
  connectionReducer,
  type ConnectionAction,
  type ConnectionState,
} from '../src/shared/state/state.js';

type SocketEvent = { readonly code?: number };

class FakeSocket {
  readonly listeners = new Map<string, Set<(event: SocketEvent) => void>>();
  readonly close = vi.fn((_code = 1000) => {
    this.emit('close', { code: _code });
  });

  constructor(readonly sessionExpiresAt: string | undefined) {}

  addEventListener(type: string, listener: (event: SocketEvent) => void): void {
    const listeners = this.listeners.get(type) ?? new Set<(event: SocketEvent) => void>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string, event: SocketEvent = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

interface SocketHarness {
  readonly sockets: FakeSocket[];
  readonly openTimes: number[];
  readonly dispatchConnection: ReturnType<typeof vi.fn>;
  readonly getConnection: () => ConnectionState;
  readonly dispose: () => void;
}

const SESSION_ID = 'session_connection_lifecycle';
const EMPTY_PAGE = { items: [], coversThrough: 0 };

function createHarness(expiries: readonly (string | undefined)[]): SocketHarness {
  const sockets: FakeSocket[] = [];
  const openTimes: number[] = [];
  let connection: ConnectionState = {
    phase: 'authenticating',
    changedAt: new Date().toISOString(),
    lastMessageAt: null,
    detail: null,
  };

  const dispatchConnection = vi.fn((action: ConnectionAction) => {
    connection = connectionReducer(connection, action);
  });

  relay.openSyncSocket.mockImplementation(
    (
      _sessionId: string,
      _cursor: unknown,
      _onMessage: (message: SyncMessage) => void,
    ): Promise<FakeSocket> => {
      const socket = new FakeSocket(expiries[sockets.length]);
      sockets.push(socket);
      openTimes.push(Date.now());
      return Promise.resolve(socket);
    },
  );

  const dispose = $effect.root(() => {
    useSyncSocket({
      getSessionId: () => SESSION_ID,
      getCache: () => null,
      getCacheResumeGeneration: () => 0,
      getTodoRefreshGeneration: () => 0,
      dispatchConnection,
      dispatchTranscript: vi.fn(),
      dispatchTodoProjection: vi.fn(),
      runtimeControls: {
        refresh: vi.fn(),
        invalidatePlan: vi.fn(),
      },
    });
  });

  return {
    sockets,
    openTimes,
    dispatchConnection,
    getConnection: () => connection,
    dispose,
  };
}

async function waitForSocket(): Promise<void> {
  for (let attempt = 0; attempt < 8 && relay.openSyncSocket.mock.calls.length === 0; attempt += 1) {
    await Promise.resolve();
  }
  expect(relay.openSyncSocket).toHaveBeenCalledTimes(1);
  for (let attempt = 0; attempt < 4; attempt += 1) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  relay.fetchTranscript.mockResolvedValue(EMPTY_PAGE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sync socket close classification', () => {
  it('surfaces revocation and never schedules another connection', async () => {
    const harness = createHarness([new Date(Date.now() + 60_000).toISOString()]);
    await waitForSocket();

    harness.sockets[0]?.emit('close', { code: 4003 });

    expect(harness.getConnection().phase).toBe('unenrolled');
    expect(vi.getTimerCount()).toBe(0);
    const callsAfterRevocation = relay.openSyncSocket.mock.calls.length;
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(callsAfterRevocation);

    harness.dispose();
  });

  it('reconnects immediately after session expiry without growing backoff', async () => {
    const harness = createHarness([new Date(Date.now() + 60_000).toISOString(), undefined]);
    await waitForSocket();
    harness.dispatchConnection({ type: 'live', at: new Date().toISOString() });

    harness.sockets[0]?.emit('close', { code: 4001 });
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    await Promise.resolve();

    harness.sockets[1]?.emit('close', { code: 1006 });
    vi.advanceTimersByTime(1_999);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(3);

    harness.dispose();
  });

  it('keeps the existing two-second delay for an ordinary close', async () => {
    const harness = createHarness([undefined, undefined]);
    await waitForSocket();

    harness.sockets[0]?.emit('close', { code: 1006 });
    vi.advanceTimersByTime(1_999);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);

    expect(relay.openSyncSocket).toHaveBeenCalledTimes(2);
    expect(harness.openTimes[1] - (harness.openTimes[0] ?? 0)).toBe(2_000);

    harness.dispose();
  });

  it('swaps the socket at eighty percent of the remaining session lifetime while live', async () => {
    const ttlMs = 10_000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const harness = createHarness([expiresAt, undefined]);
    await waitForSocket();
    harness.dispatchConnection({ type: 'live', at: new Date().toISOString() });
    const firstSocket = harness.sockets[0];

    vi.advanceTimersByTime(7_999);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(1);
    expect(harness.getConnection().phase).toBe('live');

    vi.advanceTimersByTime(1);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    await Promise.resolve();

    expect(harness.openTimes[1] - (harness.openTimes[0] ?? 0)).toBe(8_000);
    expect(harness.getConnection().phase).toBe('live');
    expect(firstSocket?.close).toHaveBeenCalledOnce();

    harness.sockets[1]?.emit('close', { code: 1006 });
    vi.advanceTimersByTime(1_999);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(relay.openSyncSocket).toHaveBeenCalledTimes(3);

    harness.dispose();
  });
});
