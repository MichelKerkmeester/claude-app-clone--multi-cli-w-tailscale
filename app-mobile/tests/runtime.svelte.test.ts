// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime State Machine Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/runtime.test.tsx (React behavior oracle) to the
// Svelte runes factory. The React *.test.tsx oracle is NEVER modified.
// Proves the complete state table, the synchronous one-selection lock, the
// 10-second delivery deadline with no replay, one-time read-only reconcile
// after stale/unsupported, bounded issue recovery, refresh coalescing, and
// that raw host text never reaches visible or assistive copy.
//
// The pure-logic describes (state table, mode authority projection, and the
// announcement projections) call the shared reducers directly with NO
// rendering, identical to the oracle. The describes that exercise useRuntime
// mount the runes factory inside an `$effect.root` scope. The factory's mount
// `$effect` untracks its refresh call, so it hydrates exactly once per session
// (mirroring React's useEffect(..., [sessionId])); call-count assertions are
// oracle-exact.
//
// $state writes are synchronous, so imperative phase asserts after each
// settle read the getter directly. Fake timers mirror the oracle exactly.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { waitFor } from '@testing-library/svelte';

import type {
  RuntimeControlResponse,
  RuntimeModelCatalogDto,
  RuntimeSnapshotDto,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import { runtimeIssueMessage } from '../src/shared/state/runtime-issues.js';
import {
  BLOCKED_MUTATION_PHASES,
  INITIAL_RUNTIME_STATE,
  modeAuthority,
  runtimeAnnouncement,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeIssue,
  type RuntimePhase,
} from '../src/shared/state/runtime.js';
import { useRuntime } from '../src/shared/state/use-runtime.svelte.js';
import RuntimeStatusRegion from '../src/pages/chat/transcript/runtime-status-region.svelte';

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
    fetchPlanBinding: vi.fn(),
    controlRuntime: vi.fn(),
    setMode: vi.fn(),
    executePlan: vi.fn(),
  };
});

vi.mock('../src/shared/transport/relay.js', () => relay);

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

const PLAN_ARTIFACT = {
  planId: 'plan_001',
  planRevision: 2,
  title: 'Review the bounded change',
  summary: 'A redacted outline.',
  stepCount: 5,
  approachCount: 1,
  validity: 'valid' as const,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

const PLAN_BINDING = {
  sessionId: 'session_local',
  planId: PLAN_ARTIFACT.planId,
  planRevision: PLAN_ARTIFACT.planRevision,
  runtimeRevision: HOST_STATE.revision,
  planToken: 'token_plan_binding_abcdef0123456789',
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

// One live runes-factory scope per test, destroyed in afterEach so each test
// mounts a fresh machine with its own relay mocks.
let factoryScope: (() => void) | null = null;
let controls!: RuntimeControls;

/**
 * Mount useRuntime in an `$effect.root` scope and wait for the initial
 * hydrate to settle. waitFor polls until the ready phase is visible
 * through the controls.runtime getter.
 */
async function initRuntime(): Promise<void> {
  factoryScope?.();
  factoryScope = $effect.root(() => {
    controls = useRuntime(() => 'session_local');
  });
  await waitFor(() => {
    if (controls.runtime.phase !== 'ready-adjustable') {
      throw new Error(`expected ready-adjustable got ${controls.runtime.phase}`);
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
  relay.fetchPlanBinding.mockReset();
  relay.controlRuntime.mockResolvedValue(ACCEPTED);
  relay.executePlan.mockReset();
});

afterEach(() => {
  factoryScope?.();
  factoryScope = null;
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

  it('blocks every issue phase, whether or not it can repair itself', () => {
    // Repairability decides which recovery affordance is offered, never whether a
    // Mutation is allowed: a phase that may clear on its own has not cleared yet,
    // And foreground-required in particular is an authority barrier.
    for (const phase of [
      'unsupported',
      'delivery-unknown',
      'offline',
      'foreground-required',
      'rate-limited',
      'host-unavailable',
      'inconsistent-state',
    ] as const) {
      expect(BLOCKED_MUTATION_PHASES.has(phase)).toBe(true);
    }
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
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');

    const first = controls.setThinkingLevel('max');
    const second = controls.setThinkingLevel('high');
    await first;
    await second;
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeNull();
    expect(controls.runtime.phase).toBe('accepted');
    expect(controls.runtime.state?.thinkingLevel).toBe('max');
  });

  it('sends zero tickets and zero mutations while streaming', async () => {
    // Set up streaming mock BEFORE creating the factory.
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot({ ...HOST_STATE, streaming: true }));
    factoryScope?.();
    factoryScope = $effect.root(() => {
      controls = useRuntime(() => 'session_local');
    });
    await waitFor(() => {
      if (controls.runtime.phase !== 'streaming') {
        throw new Error(`expected streaming got ${controls.runtime.phase}`);
      }
    });
    expect(controls.runtime.phase).toBe('streaming');

    await controls.setThinkingLevel('max');
    await controls.setMode('plan');
    await controls.setModel('opencode-go', 'qwen3.8-max');
    expect(relay.controlRuntime).not.toHaveBeenCalled();
    expect(controls.runtime.state).toEqual({ ...HOST_STATE, streaming: true });

    // Idle re-enables only after a confirmed hydrate.
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
    await controls.refresh('manual');
    expect(controls.runtime.phase).toBe('ready-adjustable');
    await controls.setThinkingLevel('max');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('allows host-gated model switching while streaming', async () => {
    relay.fetchRuntimeSnapshot.mockResolvedValue(
      snapshot({ ...HOST_STATE, streaming: true }, { ...MODELS, canSetModelWhileStreaming: true }),
    );
    factoryScope?.();
    factoryScope = $effect.root(() => {
      controls = useRuntime(() => 'session_local');
    });
    await waitFor(() => {
      if (controls.runtime.phase !== 'streaming') {
        throw new Error(`expected streaming got ${controls.runtime.phase}`);
      }
    });
    expect(controls.runtime.phase).toBe('streaming');
    await controls.setModel('opencode-go', 'qwen3.8-max');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('reconciles once after stale with zero automatic mutation retries', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'stale', state: { ...HOST_STATE, revision: 9 } },
    });
    // The one read-only reconcile returns the host's current view.
    relay.fetchRuntimeSnapshot.mockResolvedValueOnce(snapshot({ ...HOST_STATE, revision: 9 }));
    await controls.setThinkingLevel('max');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2));
    // The transient stale phase settles through reconcile; the mutation was
    // never retried and the host-confirmed replacement was kept.
    expect(controls.runtime.phase).toBe('ready-adjustable');
    expect(controls.runtime.state?.revision).toBe(9);
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('reconciles once after unsupported with zero automatic mutation retries', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'unsupported', reasonCode: 'unsupported_operation' },
    });
    await controls.setThinkingLevel('max');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2));
    expect(controls.runtime.phase).toBe('ready-adjustable');
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
  });

  it('keeps delivery-unknown terminal until a read-only hydrate and never replays', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.controlRuntime.mockResolvedValue({
      outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
    });
    await controls.setThinkingLevel('max');
    expect(controls.runtime.phase).toBe('delivery-unknown');
    expect(controls.runtime.state).toEqual(HOST_STATE);
    await expect(controls.setThinkingLevel('max')).resolves.toBeNull();
    expect(relay.controlRuntime).toHaveBeenCalledTimes(1);

    // A read-only hydrate confirms state and a new selection is a new request.
    await controls.refresh('manual');
    expect(controls.runtime.phase).toBe('ready-adjustable');
    expect(controls.runtime.deliveryUnknown).toBe(false);
    await controls.setThinkingLevel('max');
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
      factoryScope?.();
      factoryScope = $effect.root(() => {
        controls = useRuntime(() => 'session_local');
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(controls.runtime.phase).toBe('ready-adjustable');

      const mutation = controls.setThinkingLevel('max');
      expect(controls.runtime.phase).toBe('pending');
      await vi.advanceTimersByTimeAsync(9_999);
      expect(controls.runtime.phase).toBe('pending');
      await vi.advanceTimersByTimeAsync(1);
      await mutation;
      expect(controls.runtime.phase).toBe('delivery-unknown');
      expect(controls.runtime.deliveryUnknown).toBe(true);
      expect(controls.runtime.state).toEqual(HOST_STATE);
      expect(relay.controlRuntime).toHaveBeenCalledTimes(1);

      await expect(controls.setThinkingLevel('max')).resolves.toBeNull();
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
      factoryScope?.();
      factoryScope = $effect.root(() => {
        controls = useRuntime(() => 'session_local');
      });
      await vi.advanceTimersByTimeAsync(8_000);
      await vi.advanceTimersByTimeAsync(0);
      expect(controls.runtime.phase).toBe('host-unavailable');
      expect(controls.runtime.issue?.code).toBe('host-unavailable');
      expect(controls.runtime.error).toBe(runtimeIssueMessage('host-unavailable'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('honors a bounded Retry-After with one read-only reconcile and a fresh selection', async () => {
    vi.useFakeTimers();
    try {
      // The mount hydrate rejects once with a bounded Retry-After.
      relay.fetchRuntimeSnapshot.mockRejectedValueOnce(
        new relay.RuntimeRelayError('rate-limited', 2_000),
      );
      factoryScope?.();
      factoryScope = $effect.root(() => {
        controls = useRuntime(() => 'session_local');
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(controls.runtime.phase).toBe('rate-limited');
      expect(controls.runtime.issue?.retryAfterMs).toBe(2_000);
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_999);
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);

      relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot());
      await vi.advanceTimersByTimeAsync(1);
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2);
      expect(controls.runtime.phase).toBe('ready-adjustable');

      await controls.setThinkingLevel('max');
      expect(relay.controlRuntime).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('discards a late mutation settle after a newer hydrate', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');

    let resolveControl!: (value: unknown) => void;
    relay.controlRuntime.mockImplementationOnce(
      () => new Promise((resolve) => (resolveControl = resolve)),
    );
    const mutation = controls.setThinkingLevel('max');
    expect(controls.runtime.phase).toBe('pending');

    relay.fetchRuntimeSnapshot.mockResolvedValueOnce(
      snapshot({ ...HOST_STATE, revision: 10 }, { ...MODELS, runtimeRevision: 10 }),
    );
    await controls.refresh('foreground');
    expect(controls.runtime.state?.revision).toBe(10);

    resolveControl({
      outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5 } },
    });
    await mutation;
    expect(controls.runtime.state?.revision).toBe(10);
  });
});

describe('refresh triggers and coalescing', () => {
  it.each(['initial', 'open', 'foreground', 'manual', 'online', 'live', 'reconcile'] as const)(
    'hydrates read-only for the %s trigger',
    async (reason) => {
      await initRuntime();
      expect(controls.runtime.phase).toBe('ready-adjustable');
      relay.fetchRuntimeSnapshot.mockClear();
      await controls.refresh(reason);
      expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(1);
      expect(controls.runtime.phase).toBe('ready-adjustable');
    },
  );

  it('coalesces concurrent refreshes into one in-flight hydrate', async () => {
    let resolveSnapshot!: (value: unknown) => void;
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');

    relay.fetchRuntimeSnapshot.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSnapshot = resolve)),
    );
    const first = controls.refresh('online');
    const second = controls.refresh('live');
    // The online trigger started; the live trigger coalesced into it.
    expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2);
    expect(controls.runtime.phase).toBe('checking');

    resolveSnapshot(snapshot());
    await first;
    await second;
    // The queued live trigger runs one more hydrate after the first settles.
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(3));
    expect(controls.runtime.phase).toBe('ready-adjustable');
  });
});

describe('plan-mode isolation', () => {
  it('keeps Build/Plan state unchanged during an effort transition', async () => {
    const planState: RuntimeStateDto = { ...HOST_STATE, mode: 'plan' };
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot(planState));
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');

    relay.controlRuntime.mockResolvedValue({
      outcome: {
        status: 'accepted',
        state: { ...planState, revision: 5, thinkingLevel: 'max' },
      },
    });
    await controls.setThinkingLevel('max');
    expect(relay.controlRuntime).toHaveBeenCalledWith(
      'session_local',
      4,
      { type: 'set_thinking_level', level: 'max' },
      undefined,
      expect.any(AbortSignal),
    );
    expect(controls.runtime.state?.mode).toBe('plan');
    expect(controls.runtime.state?.thinkingLevel).toBe('max');
  });
});

describe('live plan review and atomic execute state', () => {
  function planState(): RuntimeStateDto {
    return {
      ...HOST_STATE,
      mode: 'plan',
      plan: {
        planId: PLAN_ARTIFACT.planId,
        planRevision: PLAN_ARTIFACT.planRevision,
        validity: 'valid',
        artifact: PLAN_ARTIFACT,
      },
    };
  }

  it('keeps only a live newest artifact executable and clears its binding on feedback', () => {
    const hydrated = runtimeReducer(INITIAL_RUNTIME_STATE, {
      type: 'hydrated',
      state: planState(),
      models: MODELS,
      planBinding: PLAN_BINDING,
    });
    expect(hydrated.planArtifact).toEqual(PLAN_ARTIFACT);
    expect(hydrated.planLive).toBe(true);
    expect(hydrated.planToken).toBe(PLAN_BINDING.planToken);

    const reviewed = runtimeReducer(hydrated, { type: 'review-open' });
    expect(reviewed.reviewOpen).toBe(true);
    expect(reviewed.reviewedPlan?.artifact).toEqual(PLAN_ARTIFACT);

    const superseded = runtimeReducer(reviewed, {
      type: 'plan-invalidated',
      validity: 'superseded',
    });
    expect(superseded.planLive).toBe(false);
    expect(superseded.planToken).toBeNull();
    expect(superseded.reviewOpen).toBe(false);
    expect(superseded.reviewedPlan).toBeNull();
    expect(superseded.planHistory?.at(-1)?.planRevision).toBe(PLAN_ARTIFACT.planRevision);

    const replacement = runtimeReducer(superseded, {
      type: 'plan-event',
      artifact: { ...PLAN_ARTIFACT, planRevision: 3, title: 'Replacement plan' },
      planToken: 'token_plan_binding_replacement_1234',
      live: true,
    });
    expect(replacement.planArtifact?.planRevision).toBe(3);
    expect(replacement.planToken).toBe('token_plan_binding_replacement_1234');
  });

  it('keeps execute pending until the atomic response and never uses a mode or prompt fallback', async () => {
    relay.fetchRuntimeSnapshot.mockResolvedValue(snapshot(planState()));
    relay.fetchPlanBinding.mockResolvedValue(PLAN_BINDING);
    let resolveExecute!: (response: RuntimeControlResponse) => void;
    relay.executePlan.mockImplementation(
      () => new Promise<RuntimeControlResponse>((resolve) => (resolveExecute = resolve)),
    );
    await initRuntime();
    expect(controls.runtime.planToken).toBe(PLAN_BINDING.planToken);

    expect(controls.openPlanReview?.()).toBe(true);
    expect(controls.runtime.reviewOpen).toBe(true);

    const execution = controls.executePlan?.() ?? Promise.resolve(null);
    expect(controls.runtime.executePending).toBe(true);
    expect(relay.executePlan).toHaveBeenCalledWith(
      'session_local',
      HOST_STATE.revision,
      PLAN_ARTIFACT.planId,
      PLAN_ARTIFACT.planRevision,
      PLAN_BINDING.planToken,
      undefined,
      expect.any(AbortSignal),
    );
    expect(relay.setMode).not.toHaveBeenCalled();
    expect(relay.controlRuntime).not.toHaveBeenCalled();

    resolveExecute({
      outcome: {
        status: 'accepted',
        state: { ...planState(), revision: 5, mode: 'executing-plan' },
      },
    });
    await execution;
    expect(controls.runtime.executePending).toBe(false);
    expect(controls.runtime.state?.mode).toBe('executing-plan');
    expect(controls.runtime.planToken).toBeNull();
    expect(controls.runtime.reviewOpen).toBe(false);
  });
});

describe('mode authority projection', () => {
  it('starts unknown with no revision, settled delivery, and idle turns', () => {
    const authority = modeAuthority(INITIAL_RUNTIME_STATE);
    expect(authority.confirmedMode).toBe('unknown');
    expect(authority.transition).toBeNull();
    expect(authority.delivery).toBe('settled');
    expect(authority.planPhase).toBe('none');
    expect(authority.runtimeRevision).toBeNull();
    expect(authority.turnState).toBe('idle');
  });

  it('derives the host-confirmed mode, revision, and turn state', () => {
    const authority = modeAuthority(ready());
    expect(authority.confirmedMode).toBe('build');
    expect(authority.runtimeRevision).toBe(4);
    expect(authority.turnState).toBe('idle');
    const running = modeAuthority(readyWith({ ...HOST_STATE, streaming: true }));
    expect(running.turnState).toBe('running');
    expect(running.confirmedMode).toBe('build');
  });

  it('keeps the confirmed mode while an entering-plan intent is pending', () => {
    const pending = runtimeReducer(ready(), {
      type: 'control-start',
      operation: { type: 'set_mode', mode: 'plan' },
    });
    const authority = modeAuthority(pending);
    expect(authority.confirmedMode).toBe('build');
    expect(authority.transition).toBe('entering-plan');
  });

  it('tracks leaving-plan separately from entering-plan', () => {
    const planState: RuntimeStateDto = { ...HOST_STATE, mode: 'plan' };
    const leaving = runtimeReducer(readyWith(planState), {
      type: 'control-start',
      operation: { type: 'set_mode', mode: 'build' },
    });
    expect(modeAuthority(leaving).transition).toBe('leaving-plan');
    expect(modeAuthority(leaving).confirmedMode).toBe('plan');
    // Non-mode pending intents never look like a mode transition.
    const effort = runtimeReducer(ready(), {
      type: 'control-start',
      operation: { type: 'set_thinking_level', level: 'max' },
    });
    expect(modeAuthority(effort).transition).toBeNull();
  });

  it('keeps delivery independent: unknown only after an uncertain settle', () => {
    expect(modeAuthority(ready()).delivery).toBe('settled');
    const unknown = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    expect(modeAuthority(unknown).delivery).toBe('unknown');
  });

  it('derives the plan phase from the host plan snapshot only', () => {
    expect(modeAuthority(ready()).planPhase).toBe('none');
    const planReady = modeAuthority(
      readyWith({
        ...HOST_STATE,
        mode: 'plan',
        plan: {
          planId: 'plan_001',
          planRevision: 2,
          validity: 'valid',
          artifact: {
            planId: 'plan_001',
            planRevision: 2,
            title: 'Refactor',
            summary: 'A plan.',
            stepCount: 3,
            approachCount: 1,
            validity: 'valid',
            occurredAt: HOST_STATE.updatedAt,
          },
        },
      }),
    );
    expect(planReady.planPhase).toBe('ready');
    const superseded = modeAuthority(
      readyWith({
        ...HOST_STATE,
        plan: { planId: 'plan_001', planRevision: 3, validity: 'superseded', artifact: null },
      }),
    );
    expect(superseded.planPhase).toBe('superseded');
    // An absent plan snapshot is never misread as a ready plan.
    expect(modeAuthority(ready()).planPhase).toBe('none');
  });
});

describe('plan-mode mutation lane', () => {
  it('routes mode switches through the dedicated setMode lane, never the generic lane', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockResolvedValue({
      outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5, mode: 'plan' } },
    });
    await controls.setMode('plan');
    expect(relay.setMode).toHaveBeenCalledTimes(1);
    expect(relay.setMode).toHaveBeenCalledWith('session_local', 4, 'plan', expect.any(AbortSignal));
    expect(relay.controlRuntime).not.toHaveBeenCalled();
    expect(controls.runtime.state?.mode).toBe('plan');
    expect(controls.runtime.phase).toBe('accepted');
  });

  it('ten rapid activations produce at most one in-flight mode request', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              outcome: {
                status: 'accepted',
                state: { ...HOST_STATE, revision: 5, mode: 'plan' },
              },
            });
          }, 10);
        }),
    );
    const calls: Promise<unknown>[] = [];
    for (let index = 0; index < 10; index += 1) {
      calls.push(controls.setMode('plan'));
    }
    await Promise.all(calls);
    expect(relay.setMode).toHaveBeenCalledTimes(1);
    expect(controls.runtime.state?.mode).toBe('plan');
  });

  it('reconciles read-only once after a stale mode switch and never retries the mutation', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockResolvedValue({
      outcome: { status: 'stale', state: { ...HOST_STATE, revision: 9, mode: 'plan' } },
    });
    relay.fetchRuntimeSnapshot.mockResolvedValueOnce(
      snapshot({ ...HOST_STATE, revision: 9, mode: 'plan' }),
    );
    await controls.setMode('plan');
    expect(relay.setMode).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(relay.fetchRuntimeSnapshot).toHaveBeenCalledTimes(2));
    expect(controls.runtime.state?.mode).toBe('plan');
    expect(controls.runtime.state?.revision).toBe(9);
    expect(relay.setMode).toHaveBeenCalledTimes(1);
  });

  it('maps a mode delivery-unknown terminal and blocks until a read-only hydrate', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockResolvedValue({
      outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
    });
    await controls.setMode('plan');
    expect(controls.runtime.phase).toBe('delivery-unknown');
    expect(modeAuthority(controls.runtime).delivery).toBe('unknown');
    expect(modeAuthority(controls.runtime).confirmedMode).toBe('build');
    await expect(controls.setMode('plan')).resolves.toBeNull();
    expect(relay.setMode).toHaveBeenCalledTimes(1);
    await controls.refresh('manual');
    expect(controls.runtime.deliveryUnknown).toBe(false);
    expect(modeAuthority(controls.runtime).confirmedMode).toBe('build');
  });

  it('sends zero mode requests while the runtime is not settled ready', async () => {
    let resolveSnapshot!: (value: unknown) => void;
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockResolvedValue({
      outcome: { status: 'accepted', state: { ...HOST_STATE, mode: 'plan' } },
    });
    relay.fetchRuntimeSnapshot.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSnapshot = resolve)),
    );
    // A held-open read-only hydrate keeps the runtime checking; the mode
    // request in that window is blocked before any ticket or transport
    // work, exactly as the fail-closed gate requires.
    const refreshing = controls.refresh('manual');
    const modeAttempt = controls.setMode('plan');
    await expect(modeAttempt).resolves.toBeNull();
    expect(controls.runtime.phase).toBe('checking');
    expect(relay.setMode).not.toHaveBeenCalled();
    resolveSnapshot(snapshot());
    await refreshing;
    expect(controls.runtime.phase).toBe('ready-adjustable');
  });

  it('normalizes unavailable mode outcomes to the bounded issue shape', async () => {
    await initRuntime();
    expect(controls.runtime.phase).toBe('ready-adjustable');
    relay.setMode.mockResolvedValue({
      outcome: {
        status: 'unavailable',
        reasonCode: 'runtime_unavailable',
        issueCode: 'foreground-required',
      },
    });
    await controls.setMode('plan');
    expect(controls.runtime.phase).toBe('foreground-required');
    expect(controls.runtime.issue).toEqual(issue('foreground-required'));
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
    const { container, rerender } = render(RuntimeStatusRegion, {
      props: { runtime: { ...ready(), phase: 'delivery-unknown' } },
    });
    const region = container.querySelector('[data-runtime-announcer="true"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent(runtimeIssueMessage('delivery-unknown'));
    expect(region).not.toHaveTextContent(/error|status/iu);

    rerender({ runtime: ready() });
    expect(region).toHaveTextContent('');
  });
});
