// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime State Machine Tests
// ───────────────────────────────────────────────────────────────────
// Proves the complete state table, the synchronous one-selection lock, the
// 10-second delivery deadline with no replay, one-time read-only reconcile
// after stale/unsupported, bounded issue recovery, refresh coalescing, and
// that raw host text never reaches visible or assistive copy.

import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RuntimeControlResponse,
  RuntimeModelCatalogDto,
  RuntimeSnapshotDto,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import { runtimeIssueMessage } from '../src/runtime-issues.js';
import {
  INITIAL_RUNTIME_STATE,
  runtimeAnnouncement,
  runtimeReducer,
  useRuntime,
  type RuntimeIssue,
  type RuntimePhase,
} from '../src/runtime.js';
import { RuntimeStatusRegion } from '../src/App.js';

const relay = vi.hoisted(() => {
  class RuntimeRelayError extends Error {
    readonly issueCode: string;
    readonly retryAfterMs: number | null;

    constructor(issueCode: string, retryAfterMs: number | null = null) {
      super(issueCode);
      this.issueCode = issueCode;
      this.retryAfterMs = retryAfterMs;
    }
  }
  return {
    RuntimeRelayError,
    fetchRuntimeSnapshot: vi.fn(),
    fetchRuntimeState: vi.fn(),
    fetchRuntimeModels: vi.fn(),
    controlRuntime: vi.fn(),
  };
});

vi.mock('../src/relay.js', () => relay);

const CURRENT_MODEL = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' };
const TARGET_MODEL = { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' };

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: CURRENT_MODEL,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MODELS: RuntimeModelCatalogDto = {
  sessionId: 'session_local',
  catalogRevision: 7,
  runtimeRevision: 4,
  currentModel: CURRENT_MODEL,
  streaming: false,
  canSetModelWhileStreaming: false,
  models: [CURRENT_MODEL, TARGET_MODEL],
};

function snapshot(
  state: RuntimeStateDto = HOST_STATE,
  models: RuntimeModelCatalogDto = MODELS,
): RuntimeSnapshotDto {
  return { sessionId: 'session_local', state, models };
}

const ACCEPTED: RuntimeControlResponse = {
  outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5, thinkingLevel: 'max' } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
  relay.controlRuntime.mockResolvedValue(ACCEPTED);
});

afterEach(() => {
  vi.useRealTimers();
});

function ready() {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state: HOST_STATE,
    models: MODELS,
  });
}

function readyWith(state: RuntimeStateDto) {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state,
    models: MODELS,
  });
}

function issue(code: RuntimeIssue['code']): RuntimeIssue {
  return { code, retryAfterMs: null };
}

describe('runtime state table', () => {
  it('starts checking with nothing confirmed', () => {
    expect(INITIAL_RUNTIME_STATE.status).toBe('checking');
    expect(INITIAL_RUNTIME_STATE.phase).toBe('checking');
    expect(INITIAL_RUNTIME_STATE.state).toBeNull();
    expect(INITIAL_RUNTIME_STATE.issue).toBeNull();
  });

  it('derives ready-adjustable from an adjustable host snapshot', () => {
    const state = ready();
    expect(state.status).toBe('ready');
    expect(state.phase).toBe('ready-adjustable');
    expect(state.state).toEqual(HOST_STATE);
  });

  it('derives ready-off-only from a single off level', () => {
    const state = readyWith({
      ...HOST_STATE,
      thinkingLevel: 'off',
      availableThinkingLevels: ['off'],
    });
    expect(state.phase).toBe('ready-off-only');
    expect(state.status).toBe('ready');
  });

  it('derives ready-empty from an empty level catalog', () => {
    const state = readyWith({ ...HOST_STATE, availableThinkingLevels: [] });
    expect(state.phase).toBe('ready-empty');
    expect(state.status).toBe('ready');
  });

  it('derives streaming from a busy host and locks authority', () => {
    const state = readyWith({ ...HOST_STATE, streaming: true });
    expect(state.phase).toBe('streaming');
    expect(state.status).toBe('pending');
  });

  it('derives inconsistent-state when the confirmed level is absent from the catalog', () => {
    const state = readyWith({
      ...HOST_STATE,
      thinkingLevel: 'turbo',
      availableThinkingLevels: ['off'],
    });
    expect(state.phase).toBe('inconsistent-state');
    expect(state.status).toBe('error');
  });

  it('derives inconsistent-state when the confirmed model is absent from the catalog', () => {
    const state = readyWith({
      ...HOST_STATE,
      model: { provider: 'ghost', id: 'gone', label: 'Ghost' },
    });
    expect(state.phase).toBe('inconsistent-state');
  });

  it('never commits an optimistic value while a control is pending', () => {
    const pending = runtimeReducer(ready(), {
      type: 'control-start',
      operation: { type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' },
    });
    expect(pending.status).toBe('pending');
    expect(pending.phase).toBe('pending');
    // The committed state is unchanged — only the pending intent is recorded.
    expect(pending.state).toEqual(HOST_STATE);
    expect(pending.pending).toEqual({
      type: 'set_model',
      provider: 'opencode-go',
      modelId: 'qwen3.8-max',
    });
  });

  it('commits only the host-confirmed state on acceptance', () => {
    const confirmed: RuntimeStateDto = { ...HOST_STATE, revision: 5, thinkingLevel: 'max' };
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'accepted', state: confirmed } },
    });
    expect(settled.status).toBe('ready');
    expect(settled.phase).toBe('accepted');
    expect(settled.state).toEqual(confirmed);
    expect(settled.pending).toBeNull();
    expect(settled.issue).toBeNull();
  });

  it('replaces our view with the host state on a stale rejection', () => {
    const hostNow: RuntimeStateDto = { ...HOST_STATE, revision: 9 };
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'stale', state: hostNow } },
    });
    expect(settled.status).toBe('stale');
    expect(settled.phase).toBe('stale');
    expect(settled.state?.revision).toBe(9);
  });

  it('surfaces unsupported and unavailable without changing committed state', () => {
    for (const outcome of [
      { status: 'unsupported', reasonCode: 'unsupported_operation' },
      { status: 'unavailable', reasonCode: 'model_unavailable' },
    ] as const) {
      const settled = runtimeReducer(ready(), {
        type: 'control-settled',
        response: { outcome },
      });
      expect(settled.status).toBe('error');
      expect(settled.state).toEqual(HOST_STATE);
      expect(settled.deliveryUnknown).toBe(false);
    }
    const unsupported = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'unsupported', reasonCode: 'unsupported_operation' } },
    });
    expect(unsupported.phase).toBe('unsupported');
    const unavailable = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'unavailable', reasonCode: 'model_unavailable' } },
    });
    expect(unavailable.phase).toBe('host-unavailable');
  });

  it('maps transport issue codes to their bounded phases', () => {
    const foreground = runtimeReducer(ready(), {
      type: 'control-settled',
      response: {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'foreground-required',
        },
      },
    });
    expect(foreground.phase).toBe('foreground-required');
    expect(foreground.issue).toEqual(issue('foreground-required'));

    const rateLimited = runtimeReducer(ready(), {
      type: 'control-settled',
      response: {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'rate-limited',
        },
      },
    });
    expect(rateLimited.phase).toBe('rate-limited');
    expect(rateLimited.issue).toEqual(issue('rate-limited'));
  });

  it('marks delivery-unknown terminal and never mutates state', () => {
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    expect(settled.status).toBe('error');
    expect(settled.phase).toBe('delivery-unknown');
    expect(settled.deliveryUnknown).toBe(true);
    expect(settled.state).toEqual(HOST_STATE);
  });

  it('keeps delivery unknown blocked until a successful read-only reconciliation', () => {
    const unknown = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    const checking = runtimeReducer(unknown, { type: 'checking', phase: 'refreshing' });
    expect(checking.deliveryUnknown).toBe(true);
    expect(checking.phase).toBe('checking');
    expect(
      runtimeReducer(checking, { type: 'hydrated', state: HOST_STATE, models: MODELS })
        .deliveryUnknown,
    ).toBe(false);
  });

  it('maps hydrate failures to bounded issue phases without losing confirmed state', () => {
    const cases: ReadonlyArray<readonly [RuntimeIssue['code'], RuntimePhase]> = [
      ['offline', 'offline'],
      ['foreground-required', 'foreground-required'],
      ['rate-limited', 'rate-limited'],
      ['host-unavailable', 'host-unavailable'],
      ['invalid-response', 'inconsistent-state'],
      ['unsupported', 'unsupported'],
    ];
    for (const [code, phase] of cases) {
      const failed = runtimeReducer(ready(), {
        type: 'hydrate-failed',
        issueCode: code,
        retryAfterMs: code === 'rate-limited' ? 2_000 : null,
      });
      expect(failed.phase).toBe(phase);
      expect(failed.status).toBe('error');
      expect(failed.issue?.code).toBe(code);
      expect(failed.issue?.retryAfterMs).toBe(code === 'rate-limited' ? 2_000 : null);
      expect(failed.error).toBe(runtimeIssueMessage(code));
      expect(failed.state).toEqual(HOST_STATE);
      expect(failed.catalogPhase).toBe(code === 'offline' ? 'offline' : 'unreachable');
    }
  });

  it('invalidates to checking on reconnect', () => {
    const checking = runtimeReducer(ready(), { type: 'checking', phase: 'refreshing' });
    expect(checking.status).toBe('checking');
    expect(checking.pending).toBeNull();
  });

  it('keeps a mutation pending across a concurrent hydrate', () => {
    const pending = runtimeReducer(ready(), {
      type: 'control-start',
      operation: { type: 'set_thinking_level', level: 'max' },
    });
    const hydrated = runtimeReducer(pending, {
      type: 'hydrated',
      state: { ...HOST_STATE, revision: 10 },
      models: { ...MODELS, runtimeRevision: 10 },
    });
    expect(hydrated.phase).toBe('pending');
    expect(hydrated.status).toBe('pending');
    expect(hydrated.pending).toEqual({ type: 'set_thinking_level', level: 'max' });
    expect(hydrated.state?.revision).toBe(10);
  });
});

describe('useRuntime mutation boundary', () => {
  it('allows exactly one selection per tick and ignores a same-tick repeat', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.setThinkingLevel('max');
      second = result.current.setThinkingLevel('high');
    });
    await act(async () => {
      await first;
      await second;
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    expect(await second).toBeNull();
    expect(result.current.runtime.phase).toBe('accepted');
    expect(result.current.runtime.state?.thinkingLevel).toBe('max');
  });

  it('sends zero tickets and zero mutations while streaming', async () => {
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot({ ...HOST_STATE, streaming: true }));
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('streaming'));

    await act(async () => {
      await result.current.setThinkingLevel('max');
      await result.current.setMode('plan');
      await result.current.setModel('opencode-go', 'qwen3.8-max');
    });
    expect(relay.controlRuntime).not.toHaveBeenCalled();
    expect(result.current.runtime.state).toEqual({ ...HOST_STATE, streaming: true });

    // Idle re-enables only after a confirmed hydrate.
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
    await act(async () => {
      await result.current.refresh('manual');
    });
    expect(result.current.runtime.phase).toBe('ready-adjustable');
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('allows host-gated model switching while streaming', async () => {
    relay.fetchRuntimeSnapshot.mockResolvedValue(
      snapshot({ ...HOST_STATE, streaming: true }, { ...MODELS, canSetModelWhileStreaming: true }),
    );
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('streaming'));
    await act(async () => {
      await result.current.setModel('opencode-go', 'qwen3.8-max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('reconciles once after stale with zero automatic mutation retries', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'stale', state: { ...HOST_STATE, revision: 9 } },
    });
    // The one read-only reconcile returns the host's current view.
    relay.fetchRuntimeSnapshot.mockResolvedValueOnce(snapshot({ ...HOST_STATE, revision: 9 }));
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2));
    // The transient stale phase settles through reconcile; the mutation was
    // never retried and the host-confirmed replacement was kept.
    expect(result.current.runtime.phase).toBe('ready-adjustable');
    expect(result.current.runtime.state?.revision).toBe(9);
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('reconciles once after unsupported with zero automatic mutation retries', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'unsupported', reasonCode: 'unsupported_operation' },
    });
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2));
    expect(result.current.runtime.phase).toBe('ready-adjustable');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('keeps delivery-unknown terminal until a read-only hydrate and never replays', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
    });
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(result.current.runtime.phase).toBe('delivery-unknown');
    expect(result.current.runtime.state).toEqual(HOST_STATE);
    await act(async () => {
      await expect(result.current.setThinkingLevel('max')).resolves.toBeNull();
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);

    // A read-only hydrate confirms state and a new selection is a new request.
    await act(async () => {
      await result.current.refresh('manual');
    });
    expect(result.current.runtime.phase).toBe('ready-adjustable');
    expect(result.current.runtime.deliveryUnknown).toBe(false);
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledTimes(2);
  });

  it('classifies unresolved delivery at the 10-second deadline with no replay', async () => {
    vi.useFakeTimers();
    try {
      relay.controlRuntime.mockImplementation(
        (
          _sessionId: string,
          _revision: number,
          _operation: unknown,
          _catalog?: number,
          signal?: AbortSignal,
        ) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );
      const { result } = renderHook(() => useRuntime('session_local'));
      await act(async () => {});
      expect(result.current.runtime.phase).toBe('ready-adjustable');

      let mutation!: Promise<unknown>;
      act(() => {
        mutation = result.current.setThinkingLevel('max');
      });
      expect(result.current.runtime.phase).toBe('pending');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_999);
      });
      expect(result.current.runtime.phase).toBe('pending');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
        await mutation;
      });
      expect(result.current.runtime.phase).toBe('delivery-unknown');
      expect(result.current.runtime.deliveryUnknown).toBe(true);
      expect(result.current.runtime.state).toEqual(HOST_STATE);
      expect(relay.controlRuntime).toHaveBeenCalledTimes(1);

      await act(async () => {
        await expect(result.current.setThinkingLevel('max')).resolves.toBeNull();
      });
      expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces host-unavailable when a hydrate exceeds its deadline', async () => {
    vi.useFakeTimers();
    try {
      relay.fetchRuntimeSnapshot.mockImplementation(
        (_signal?: AbortSignal) =>
          new Promise((_resolve, reject) => {
            _signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );
      const { result } = renderHook(() => useRuntime('session_local'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(8_000);
      });
      expect(result.current.runtime.phase).toBe('host-unavailable');
      expect(result.current.runtime.issue?.code).toBe('host-unavailable');
      expect(result.current.runtime.error).toBe(runtimeIssueMessage('host-unavailable'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('honors a bounded Retry-After with one read-only reconcile and a fresh selection', async () => {
    vi.useFakeTimers();
    try {
      relay.fetchRuntimeSnapshot.mockRejectedValueOnce(
        new relay.RuntimeRelayError('rate-limited', 2_000),
      );
      const { result } = renderHook(() => useRuntime('session_local'));
      await act(async () => {});
      expect(result.current.runtime.phase).toBe('rate-limited');
      expect(result.current.runtime.issue?.retryAfterMs).toBe(2_000);
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_999);
      });
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);

      relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2);
      expect(result.current.runtime.phase).toBe('ready-adjustable');

      await act(async () => {
        await result.current.setThinkingLevel('max');
      });
      expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('discards a late mutation settle after a newer hydrate', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));

    let resolveControl!: (value: unknown) => void;
    relay.controlRuntime.mockImplementationOnce(
      () => new Promise((resolve) => (resolveControl = resolve)),
    );
    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.setThinkingLevel('max');
    });
    await waitFor(() => expect(result.current.runtime.phase).toBe('pending'));

    relay.fetchRuntimeSnapshot.mockResolvedValueOnce(
      snapshot({ ...HOST_STATE, revision: 10 }, { ...MODELS, runtimeRevision: 10 }),
    );
    await act(async () => {
      await result.current.refresh('foreground');
    });
    expect(result.current.runtime.state?.revision).toBe(10);

    await act(async () => {
      resolveControl({
        outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5 } },
      });
      await mutation;
    });
    expect(result.current.runtime.state?.revision).toBe(10);
  });
});

describe('refresh triggers and coalescing', () => {
  it.each(['initial', 'open', 'foreground', 'manual', 'online', 'live', 'reconcile'] as const)(
    'hydrates read-only for the %s trigger',
    async (reason) => {
      const { result } = renderHook(() => useRuntime('session_local'));
      await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));
      relay.fetchRuntimeSnapshot.mockClear();
      await act(async () => {
        await result.current.refresh(reason);
      });
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);
      expect(result.current.runtime.phase).toBe('ready-adjustable');
    },
  );

  it('coalesces concurrent refreshes into one in-flight hydrate', async () => {
    let resolveSnapshot!: (value: unknown) => void;
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));

    relay.fetchRuntimeSnapshot.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSnapshot = resolve)),
    );
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.refresh('online');
      second = result.current.refresh('live');
    });
    // The online trigger started; the live trigger coalesced into it.
    expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2);
    expect(result.current.runtime.phase).toBe('checking');

    await act(async () => {
      resolveSnapshot(snapshot());
      await first;
      await second;
    });
    // The queued live trigger runs one more hydrate after the first settles.
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(3));
    expect(result.current.runtime.phase).toBe('ready-adjustable');
  });
});

describe('plan-mode isolation', () => {
  it('keeps Build/Plan state unchanged during an effort transition', async () => {
    const planState: RuntimeStateDto = { ...HOST_STATE, mode: 'plan' };
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot(planState));
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.phase).toBe('ready-adjustable'));

    relay.controlRuntime.mockResolvedValue({
      outcome: {
        status: 'accepted',
        state: { ...planState, revision: 5, thinkingLevel: 'max' },
      },
    });
    await act(async () => {
      await result.current.setThinkingLevel('max');
    });
    expect(relay.controlRuntime).toHaveBeenCalledWith(
      'session_local',
      4,
      { type: 'set_thinking_level', level: 'max' },
      undefined,
      expect.any(AbortSignal),
    );
    expect(result.current.runtime.state?.mode).toBe('plan');
    expect(result.current.runtime.state?.thinkingLevel).toBe('max');
  });
});

describe('runtime announcement and status region', () => {
  it('announces only bounded local copy for every phase', () => {
    const phases: ReadonlyArray<readonly [RuntimePhase, string]> = [
      ['checking', 'Checking runtime…'],
      ['ready-adjustable', ''],
      ['ready-off-only', ''],
      ['ready-empty', ''],
      ['streaming', 'Available when the current turn ends.'],
      ['pending', 'Applying change…'],
      ['accepted', 'Runtime change accepted.'],
      ['stale', 'The host runtime changed. Refreshed.'],
      ['unsupported', runtimeIssueMessage('unsupported')],
      ['offline', runtimeIssueMessage('offline')],
      ['foreground-required', runtimeIssueMessage('foreground-required')],
      ['rate-limited', runtimeIssueMessage('rate-limited')],
      ['host-unavailable', runtimeIssueMessage('host-unavailable')],
      ['delivery-unknown', runtimeIssueMessage('delivery-unknown')],
      ['inconsistent-state', runtimeIssueMessage('invalid-response')],
    ];
    for (const [phase, expected] of phases) {
      const runtime = {
        ...ready(),
        phase,
        pending:
          phase === 'pending' ? ({ type: 'set_thinking_level', level: 'max' } as const) : null,
        issue: issue('host-unavailable'),
      };
      const message = runtimeAnnouncement(runtime);
      expect(message).toBe(expected);
      expect(message).not.toMatch(/error|status|\b\d{3}\b/iu);
    }
  });

  it('mounts one polite atomic runtime status region with bounded text', () => {
    const { container, rerender } = render(
      <RuntimeStatusRegion runtime={{ ...ready(), phase: 'delivery-unknown' }} />,
    );
    const region = container.querySelector('[data-runtime-announcer="true"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent(runtimeIssueMessage('delivery-unknown'));
    expect(region).not.toHaveTextContent(/error|status/iu);

    rerender(<RuntimeStatusRegion runtime={ready()} />);
    expect(region).toHaveTextContent('');
  });
});
