// ───────────────────────────────────────────────────────────────────
// MODULE: Command Catalog Lifecycle Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Port of app-mobile/tests/catalogLifecycle.test.tsx (React behavior oracle)
// to the Svelte runes factory. The React *.test.tsx oracle is NEVER modified.
// Proves the session-scoped in-memory lifecycle: one shared prefetch, no
// persistence, request coalescing, foreground staleness gating, and fail-
// closed commits — session switches, host-epoch changes, aborts, and out-of-
// order responses can never overwrite the scoped snapshot. Also covers
// binding creation and scope validity.
//
// The factory describe uses CatalogLifecycleHarness.svelte, which mounts
// useHostCommandCatalog inside a component <script> and projects the live
// HostCommandCatalogState via onControls. The pure-logic describes (binding
// scope, lifecycle helper determinism) import the shared helpers from
// commands.ts directly — identical to the oracle.

import { cleanup, render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandCatalogDto, CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import {
  bindingFor,
  bindingMatchesSnapshot,
  CATALOG_STALE_AFTER_MS,
  type HostCommandCatalogState,
  type SelectedCommandBinding,
  type ScopedCommandSnapshot,
} from '../src/shared/data/commands.js';
import CatalogLifecycleHarness from './support/CatalogLifecycleHarness.svelte';

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

vi.mock('../src/shared/data/relay.js', () => relay);

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

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  relay.fetchCommands.mockResolvedValue(catalog());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useHostCommandCatalog lifecycle', () => {
  it('prefetches one catalog for a live session and shares it between consumers', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });

    await waitFor(() => expect(controls.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();
    expect(controls.snapshot).not.toBeNull();
    expect(controls.snapshot?.sessionId).toBe(SESSION_A);
    expect(controls.snapshot?.hostEpoch).toBe(EPOCH_1);
    expect(controls.commands.map((item) => item.name)).toEqual(['plan']);
    // Both surfaces read the same committed snapshot object.
    expect(controls.commands).toBe(controls.snapshot?.commands);
  });

  it('keeps the catalog strictly in memory: nothing reaches browser storage', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });

    await waitFor(() => expect(controls.status).toBe('ready'));
    await controls.refresh('manual');
    flushSync();
    bindingFor(controls.snapshot, 'plan');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('coalesces concurrent refresh triggers into one in-flight request', async () => {
    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });

    // The initial refresh is in flight; queue two more triggers.
    flushSync();
    void controls.refresh('foreground');
    void controls.refresh('manual');
    // Still loading: the initial request is in flight and the later triggers
    // were folded into it, not fired as new requests.
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    pending.resolve(catalog());
    await waitFor(() => expect(controls.status).toBe('ready'));
    // The queued manual trigger re-runs after the shared request settles.
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);
  });

  it('skips foreground revalidation while the snapshot is fresh', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });

    await waitFor(() => expect(controls.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    await controls.refresh('foreground');
    await controls.refresh('online');
    expect(relay.fetchCommands).toHaveBeenCalledOnce();
  });

  it('revalidates on foreground after the staleness window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    relay.fetchCommands.mockResolvedValue(catalog());
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    await flushMicrotasks();
    flushSync();
    expect(controls.status).toBe('ready');
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    vi.setSystemTime(new Date('2026-01-01T00:00:31.000Z'));
    await controls.refresh('foreground');
    flushSync();
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);
    expect(controls.status).toBe('ready');
  });

  it('never shows another session rows after a session switch, even for a late response', async () => {
    const pendingA = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pendingA.promise);
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    const view = render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    // A's fetch is still in flight when the session changes.
    await view.rerender({ sessionId: SESSION_B, onControls });
    flushSync();
    expect(controls.status).toBe('loading');
    expect(controls.snapshot).toBeNull();

    const pendingB = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pendingB.promise);
    // The stale A response resolves after the switch: it must not commit.
    pendingA.resolve(catalog({ sessionId: SESSION_A, commands: [descriptor('old-row')] }));
    await flushMicrotasks();
    flushSync();
    expect(controls.snapshot).toBeNull();
    expect(controls.status).toBe('loading');

    // B's prefetch was queued behind the aborted A request and now runs.
    await flushMicrotasks();
    flushSync();
    expect(relay.fetchCommands).toHaveBeenCalledTimes(2);

    pendingB.resolve(catalog({ sessionId: SESSION_B, commands: [descriptor('new-row')] }));
    await waitFor(() => expect(controls.status).toBe('ready'));
    expect(controls.snapshot?.sessionId).toBe(SESSION_B);
    expect(controls.commands.map((item) => item.name)).toEqual(['new-row']);
  });

  it('refuses to commit a response for a different session (scope mismatch)', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    await waitFor(() => expect(controls.status).toBe('ready'));

    relay.fetchCommands.mockResolvedValueOnce(
      catalog({ sessionId: SESSION_B, commands: [descriptor('foreign-row')] }),
    );
    await controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('stale');
    expect(controls.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);
  });

  it('refuses to commit a response for a changed host epoch', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    await waitFor(() => expect(controls.status).toBe('ready'));

    relay.fetchCommands.mockResolvedValueOnce(
      catalog({ hostEpoch: EPOCH_2, commands: [descriptor('epoch-2-row')] }),
    );
    await controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('stale');
    expect(controls.snapshot?.hostEpoch).toBe(EPOCH_1);
    expect(controls.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);
  });

  it('keeps the committed snapshot visible while a refresh is in flight', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    await waitFor(() => expect(controls.status).toBe('ready'));

    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    void controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('refreshing');
    expect(controls.snapshot?.commands.map((item) => item.name)).toEqual(['plan']);

    pending.resolve(catalog({ catalogRevision: 2 }));
    await waitFor(() => expect(controls.status).toBe('ready'));
    expect(controls.snapshot?.catalogRevision).toBe(2);
  });

  it('clears the snapshot on forbidden and keeps it on unavailable or incompatible', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    await waitFor(() => expect(controls.status).toBe('ready'));

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('unavailable'));
    await controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('unavailable');
    expect(controls.snapshot).not.toBeNull();

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('incompatible'));
    await controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('incompatible');
    expect(controls.snapshot).not.toBeNull();

    relay.fetchCommands.mockRejectedValueOnce(new relay.CatalogLifecycleError('forbidden'));
    await controls.refresh('reconnect');
    flushSync();
    expect(controls.status).toBe('forbidden');
    expect(controls.snapshot).toBeNull();
  });

  it('ignores aborted requests entirely', async () => {
    const pending = deferred<CommandCatalogDto>();
    relay.fetchCommands.mockReturnValueOnce(pending.promise);
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    const view = render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'live', onControls },
    });
    expect(controls.status).toBe('loading');

    view.unmount();
    // The response settles after unmount; nothing is dispatched and nothing
    // throws through the renderer.
    pending.resolve(catalog());
    await flushMicrotasks();
  });

  it('revalidates when the connection transitions into live', async () => {
    let controls!: HostCommandCatalogState;
    const onControls = vi.fn((c: HostCommandCatalogState) => {
      controls = c;
    });
    const view = render(CatalogLifecycleHarness, {
      props: { sessionId: SESSION_A, connection: 'connecting', onControls },
    });
    await waitFor(() => expect(controls.status).toBe('ready'));
    expect(relay.fetchCommands).toHaveBeenCalledOnce();

    await view.rerender({ sessionId: SESSION_A, connection: 'live', onControls });
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