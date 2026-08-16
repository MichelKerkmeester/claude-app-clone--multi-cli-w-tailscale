// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime UI State Machine Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

const relay = vi.hoisted(() => ({
  controlRuntime: vi.fn(),
  fetchRuntimeModels: vi.fn(),
  fetchRuntimeState: vi.fn(),
}));

vi.mock('../src/relay.js', () => relay);

import { INITIAL_RUNTIME_STATE, runtimeReducer, useRuntime } from '../src/runtime.js';

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
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
  currentModel: HOST_STATE.model,
  streaming: false,
  canSetModelWhileStreaming: false,
  models: [
    { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  relay.fetchRuntimeState.mockResolvedValue(HOST_STATE);
  relay.fetchRuntimeModels.mockResolvedValue(MODELS);
});

function ready() {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state: HOST_STATE,
    models: MODELS,
  });
}

describe('runtime UI state machine', () => {
  it('hydrates to ready with host state and models', () => {
    const state = ready();
    expect(state.status).toBe('ready');
    expect(state.state).toEqual(HOST_STATE);
    expect(state.models).toHaveLength(2);
  });

  it('never commits an optimistic value while a control is pending', () => {
    const pending = runtimeReducer(ready(), {
      type: 'control-start',
      operation: { type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' },
    });
    expect(pending.status).toBe('pending');
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
    expect(settled.state).toEqual(confirmed);
    expect(settled.pending).toBeNull();
  });

  it('replaces our view with the host state on a stale rejection', () => {
    const hostNow: RuntimeStateDto = { ...HOST_STATE, revision: 9 };
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'stale', state: hostNow } },
    });
    expect(settled.status).toBe('stale');
    expect(settled.state?.revision).toBe(9);
  });

  it('surfaces unsupported and unavailable without changing committed state', () => {
    for (const status of ['unsupported', 'unavailable'] as const) {
      const settled = runtimeReducer(ready(), {
        type: 'control-settled',
        response: {
          outcome:
            status === 'unsupported'
              ? { status, reasonCode: 'unsupported_operation' }
              : { status, reasonCode: 'model_unavailable' },
        },
      });
      expect(settled.status).toBe('error');
      expect(settled.state).toEqual(HOST_STATE);
      expect(settled.deliveryUnknown).toBe(false);
    }
  });

  it('marks delivery-unknown terminal and never mutates state', () => {
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    expect(settled.status).toBe('error');
    expect(settled.deliveryUnknown).toBe(true);
    expect(settled.state).toEqual(HOST_STATE);
  });

  it('invalidates to checking on reconnect', () => {
    const checking = runtimeReducer(ready(), { type: 'checking', phase: 'refreshing' });
    expect(checking.status).toBe('checking');
    expect(checking.pending).toBeNull();
  });

  it('keeps delivery unknown blocked until a successful read-only reconciliation', () => {
    const unknown = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    const checking = runtimeReducer(unknown, { type: 'checking', phase: 'refreshing' });
    expect(checking.deliveryUnknown).toBe(true);
    expect(
      runtimeReducer(checking, { type: 'hydrated', state: HOST_STATE, models: MODELS })
        .deliveryUnknown,
    ).toBe(false);
  });

  it('clears sensitive runtime catalog state on access denial', () => {
    const denied = runtimeReducer(ready(), {
      type: 'hydrate-failed',
      phase: 'access_denied',
      error: 'Access expired. Reconnect to load runtime data.',
    });
    expect(denied.catalogPhase).toBe('access_denied');
    expect(denied.state).toBeNull();
    expect(denied.models).toEqual([]);
    expect(denied.catalogRevision).toBeNull();
  });

  it('ignores a late catalog generation after a newer refresh settles', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.status).toBe('ready'));

    let resolveOldState!: (state: RuntimeStateDto) => void;
    let resolveOldCatalog!: (catalog: RuntimeModelCatalogDto) => void;
    relay.fetchRuntimeState.mockImplementationOnce(
      () => new Promise<RuntimeStateDto>((resolve) => (resolveOldState = resolve)),
    );
    relay.fetchRuntimeModels.mockImplementationOnce(
      () => new Promise<RuntimeModelCatalogDto>((resolve) => (resolveOldCatalog = resolve)),
    );
    const oldRefresh = result.current.refresh('manual');

    const newerState = { ...HOST_STATE, revision: 9 };
    const newerCatalog = { ...MODELS, runtimeRevision: 9, catalogRevision: 8 };
    relay.fetchRuntimeState.mockResolvedValueOnce(newerState);
    relay.fetchRuntimeModels.mockResolvedValueOnce(newerCatalog);
    await act(async () => result.current.refresh('foreground'));
    expect(result.current.runtime.state?.revision).toBe(9);

    await act(async () => {
      resolveOldState({ ...HOST_STATE, revision: 5 });
      resolveOldCatalog({ ...MODELS, runtimeRevision: 5 });
      await oldRefresh;
    });
    expect(result.current.runtime.state?.revision).toBe(9);
    expect(result.current.runtime.catalogRevision).toBe(8);
  });

  it('does not let a late mutation overwrite newer reconciled host state', async () => {
    const { result } = renderHook(() => useRuntime('session_local'));
    await waitFor(() => expect(result.current.runtime.status).toBe('ready'));

    let resolveControl!: (response: {
      outcome: { status: 'accepted'; state: RuntimeStateDto };
    }) => void;
    relay.controlRuntime.mockImplementationOnce(
      () => new Promise((resolve) => (resolveControl = resolve)),
    );
    let mutation!: Promise<unknown>;
    act(() => {
      mutation = result.current.setModel('opencode-go', 'qwen3.8-max');
    });
    await waitFor(() => expect(result.current.runtime.status).toBe('pending'));

    const reconciledState = { ...HOST_STATE, revision: 10 };
    relay.fetchRuntimeState.mockResolvedValueOnce(reconciledState);
    relay.fetchRuntimeModels.mockResolvedValueOnce({
      ...MODELS,
      runtimeRevision: 10,
      catalogRevision: 9,
    });
    await act(async () => result.current.refresh('foreground'));
    expect(result.current.runtime.state?.revision).toBe(10);

    await act(async () => {
      resolveControl({
        outcome: {
          status: 'accepted',
          state: {
            ...HOST_STATE,
            revision: 5,
            model: MODELS.models[1] ?? null,
          },
        },
      });
      await mutation;
    });
    expect(result.current.runtime.state?.revision).toBe(10);
  });
});
