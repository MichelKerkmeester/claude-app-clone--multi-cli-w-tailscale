// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime UI State Machine Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

import { INITIAL_RUNTIME_STATE, runtimeReducer } from '../src/runtime.js';

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
  runtimeRevision: 4,
  models: [
    { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' },
  ],
};

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
        response: { outcome: { status, reason: `${status} reason` } },
      });
      expect(settled.status).toBe('error');
      expect(settled.state).toEqual(HOST_STATE);
      expect(settled.deliveryUnknown).toBe(false);
    }
  });

  it('marks delivery-unknown terminal and never mutates state', () => {
    const settled = runtimeReducer(ready(), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reason: 'transport failed' } },
    });
    expect(settled.status).toBe('error');
    expect(settled.deliveryUnknown).toBe(true);
    expect(settled.state).toEqual(HOST_STATE);
  });

  it('invalidates to checking on reconnect', () => {
    const checking = runtimeReducer(ready(), { type: 'checking' });
    expect(checking.status).toBe('checking');
    expect(checking.pending).toBeNull();
  });
});
