// ───────────────────────────────────────────────────────────────────
// MODULE: Command Catalog Lifecycle Tests
// ───────────────────────────────────────────────────────────────────
// Proves the session-scoped in-memory lifecycle: one shared prefetch, no
// persistence, request coalescing, foreground staleness gating, and fail-
// closed commits — session switches, host-epoch changes, aborts, and
// out-of-order responses can never overwrite the scoped snapshot. Also
// covers binding creation and scope validity.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandCatalogDto, CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

const relay = vi.hoisted(() => {
  class CatalogLifecycleError extends Error {
    readonly code: 'unavailable' | 'forbidden' | 'incompatible';

    constructor(code: 'unavailable' | 'forbidden' | 'incompatible') {
      super('catalog lifecycle failure');
      this.name = 'CatalogLifecycleError';
      this.code = code;
    }
  }
  return {
    CatalogLifecycleError,
    fetchCommands: vi.fn(),
  };
});

vi.mock('../src/relay.js', () => relay);

import {
  bindingFor,
  bindingMatchesSnapshot,
  CATALOG_STALE_AFTER_MS,
  useHostCommandCatalog,
  type SelectedCommandBinding,
  type ScopedCommandSnapshot,
} from '../src/commands.js';

const SESSION_A = 'session_a';
const SESSION_B = 'session_b';
const EPOCH_1 = 'epoch_1';
const EPOCH_2 = 'epoch_2';

function descriptor(name: string, enabled = true): CommandDescriptorDto {
  return {
    name,
    description: null,
    source: 'extension',
    enabled,
    disabledReason: null,
    requiresConfirmation: false,
  };
}

function catalog(
  overrides: Partial<CommandCatalogDto> = {},
): CommandCatalogDto {
  return {
    hostEpoch: EPOCH_1,
    sessionId: SESSION_A,
    sessionRevision: 1,
    catalogRevision: 1,
    commands: [descriptor('plan')],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  relay.fetchCommands.mockResolvedValue(catalog());
});

afterEach(() => {
  vi.useRealTimers();
});

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useHostCommandCatalog lifecycle', () => {
  it('prefetches one catalog for a live session and shares it between consumers', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();
    expect(result.current.snapshot).not.toBeNull();
    expect(result.current.snapshot?.sessionId).toBe(SESSION_A);
    expect(result.current.snapshot?.hostEpoch).toBe(EPOCH_1);
    expect(result.current.commands.map((item) => item.name)).toEqual(['plan']);
    // Both surfaces read the same committed snapshot object.
    expect(result.current.commands).toBe(result.current.snapshot?.commands);
  });

  it('keeps the catalog strictly in memory: nothing reaches browser storage', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.refresh('manual');
    });
    bindingFor(result.current.snapshot, 'plan');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('coalesces concurrent refresh triggers into one in-flight request', async () => {
    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));

    await act(async () => {
      void result.current.refresh('foreground');
      void result.current.refresh('manual');
    });
    // Still loading: the initial request is in flight and the later triggers
    // were folded into it, not fired as new requests.
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    await act(async () => {
      pending.resolve(catalog());
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    // The queued manual trigger re-runs after the shared request settles.
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);
  });

  it('skips foreground revalidation while the snapshot is fresh', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    await act(async () => {
      await result.current.refresh('foreground');
      await result.current.refresh('online');
    });
    expect(relay.fetchCommands).toHaveBeenCalledOnce();
  });

  it('revalidates on foreground after the staleness window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    relay.fetchCommands.mockResolvedValue(catalog());
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await flushMicrotasks();
    expect(result.current.status).toBe('ready');
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date('2026-01-01T00:00:31.000Z'));
    await act(async () => {
      await result.current.refresh('foreground');
    });
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('ready');
  });

  it('never shows another session rows after a session switch, even for a late response', async () => {
    const pendingA = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pendingA.promise);
    const { result, rerender } = renderHook(
      ({ sessionId }) => useHostCommandCatalog(sessionId, 'live'),
      { initialProps: { sessionId: SESSION_A } },
    );
    // A's fetch is still in flight when the session changes.
    rerender({ sessionId: SESSION_B });
    expect(result.current.status).toBe('loading');
    expect(result.current.snapshot).toBeNull();

    const pendingB = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pendingB.promise);

    // The stale A response resolves after the switch: it must not commit.
    await act(async () => {
      pendingA.resolve(catalog({ sessionId: SESSION_A, commands: [descriptor('old-row')] }));
    });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.status).toBe('loading');

    // B's prefetch was queued behind the aborted A request and now runs.
    await act(async () => {
      await flushMicrotasks();
    });
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);

    await act(async () => {
      pendingB.resolve(catalog({ sessionId: SESSION_B, commands: [descriptor('new-row')] }));
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.snapshot?.sessionId).toBe(SESSION_B);
    expect(result.current.commands.map((item) => item.name)).toEqual(['new-row']);
  });

  it('refuses to commit a response for a different session (scope mismatch)', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    relay.fetchCommands.mockResolvedValueOnce(
      catalog({ sessionId: SESSION_B, commands: [descriptor('foreign-row')] }),
    );
    await act(async () => {
      await result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('stale');
    expect(result.current.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);
  });

  it('refuses to commit a response for a changed host epoch', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    relay.fetchCommands.mockResolvedValueOnce(
      catalog({ hostEpoch: EPOCH_2, commands: [descriptor('epoch-2-row')] }),
    );
    await act(async () => {
      await result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('stale');
    expect(result.current.snapshot?.hostEpoch).toBe(EPOCH_1);
    expect(result.current.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);
  });

  it('keeps the committed snapshot visible while a refresh is in flight', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    await act(async () => {
      void result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('refreshing');
    expect(result.current.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);

    await act(async () => {
      pending.resolve(catalog({ catalogRevision: 2 }));
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.snapshot?.catalogRevision).toBe(2);
  });

  it('clears the snapshot on forbidden and keeps it on unavailable or incompatible', async () => {
    const { result } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('unavailable'));
    await act(async () => {
      await result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('unavailable');
    expect(result.current.snapshot).not.toBeNull();

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('incompatible'));
    await act(async () => {
      await result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('incompatible');
    expect(result.current.snapshot).not.toBeNull();

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('forbidden'));
    await act(async () => {
      await result.current.refresh('reconnect');
    });
    expect(result.current.status).toBe('forbidden');
    expect(result.current.snapshot).toBeNull();
  });

  it('ignores aborted requests entirely', async () => {
    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useHostCommandCatalog(SESSION_A, 'live'));
    expect(result.current.status).toBe('loading');

    unmount();
    // The response settles after unmount; nothing is dispatched and nothing
    // throws through the renderer.
    await act(async () => {
      pending.resolve(catalog());
    });
  });

  it('revalidates when the connection transitions into live', async () => {
    const { result, rerender } = renderHook(
      ({ connection }) => useHostCommandCatalog(SESSION_A, connection),
      { initialProps: { connection: 'connecting' as const } },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    rerender({ connection: 'live' });
    await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledTimes(2));
  });
});

describe('binding scope', () => {
  const snapshot: ScopedCommandSnapshot = {
    hostEpoch: EPOCH_1,
    sessionId: SESSION_A,
    sessionRevision: 3,
    catalogRevision: 7,
    commands: [descriptor('plan'), descriptor('lock', false)],
    fetchedAt: 0,
  };

  it('creates a binding only from an enabled row of the current snapshot', () => {
    expect(bindingFor(snapshot, 'plan')).toEqual({
      hostEpoch: EPOCH_1,
      sessionId: SESSION_A,
      name: 'plan',
      sessionRevision: 3,
      catalogRevision: 7,
    });
    expect(bindingFor(snapshot, 'lock')).toBeNull();
    expect(bindingFor(snapshot, 'missing')).toBeNull();
    expect(bindingFor(null, 'plan')).toBeNull();
  });

  it('fails closed when the scope no longer matches the binding', () => {
    const binding: SelectedCommandBinding = {
      hostEpoch: EPOCH_1,
      sessionId: SESSION_A,
      name: 'plan',
      sessionRevision: 3,
      catalogRevision: 7,
    };
    expect(bindingMatchesSnapshot(binding, snapshot)).toBe(true);
    expect(
      bindingMatchesSnapshot(binding, { ...snapshot, sessionRevision: 4 }),
    ).toBe(false);
    expect(
      bindingMatchesSnapshot(binding, { ...snapshot, catalogRevision: 8 }),
    ).toBe(false);
    expect(bindingMatchesSnapshot(binding, { ...snapshot, hostEpoch: EPOCH_2 })).toBe(false);
    expect(bindingMatchesSnapshot(binding, { ...snapshot, sessionId: SESSION_B })).toBe(false);
    expect(
      bindingMatchesSnapshot(binding, { ...snapshot, commands: [descriptor('other')] }),
    ).toBe(false);
    expect(bindingMatchesSnapshot(binding, null)).toBe(false);
    expect(bindingMatchesSnapshot(null, snapshot)).toBe(true);
    expect(bindingMatchesSnapshot(null, null)).toBe(true);
  });

  it('exposes the staleness window constant used by the gate', () => {
    expect(CATALOG_STALE_AFTER_MS).toBe(30_000);
  });
});

describe('lifecycle helper determinism', () => {
  it('flushMicrotasks helper settles promise chains', async () => {
    let settled = false;
    void Promise.resolve().then(() => {
      settled = true;
    });
    await flushMicrotasks();
    expect(settled).toBe(true);
  });
});
