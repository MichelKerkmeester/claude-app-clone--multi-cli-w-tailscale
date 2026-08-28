// ───────────────────────────────────────────────────────────────────
// MODULE: Presence-aware Push Hold Queue Tests
// ───────────────────────────────────────────────────────────────────

// The alerts here are client-owned fixtures for the future push contract. The
// tests verify presence timing and never rely on a protocol DTO.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  createPushHoldQueueState,
  pushHoldCapabilityAvailable,
  reducePushHoldQueue,
  type PushHoldAlert,
  type PushHoldQueueState,
} from '../src/shared/state/push-hold-queue.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function alert(id: string): PushHoldAlert {
  return { id };
}

function enabledState(foreground = true): PushHoldQueueState {
  return createPushHoldQueueState({ push: true, presence: true }, foreground);
}

function receive(state: PushHoldQueueState, next: PushHoldAlert | undefined) {
  return reducePushHoldQueue(state, { type: 'receive', alert: next });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('presence-aware push hold queue', () => {
  it('holds an alert in the foreground and surfaces it on background', () => {
    const held = receive(enabledState(), alert('alert-1'));

    expect(held.surfaced).toEqual([]);
    expect(held.state.held).toEqual([{ id: 'alert-1' }]);

    const flushed = reducePushHoldQueue(held.state, { type: 'presence', foreground: false });

    expect(flushed.surfaced).toEqual([{ id: 'alert-1' }]);
    expect(flushed.state.held).toEqual([]);
  });

  it('drops an alert resolved while held instead of surfacing stale work', () => {
    const held = receive(enabledState(), alert('resolved-before-background'));
    const resolved = reducePushHoldQueue(held.state, {
      type: 'resolve',
      id: 'resolved-before-background',
    });
    const flushed = reducePushHoldQueue(resolved.state, { type: 'presence', foreground: false });

    expect(resolved.state.held).toEqual([]);
    expect(flushed.surfaced).toEqual([]);
    expect(flushed.state.held).toEqual([]);
  });

  it('preserves arrival order across a background flush', () => {
    const first = receive(enabledState(), alert('first'));
    const second = receive(first.state, alert('second'));
    const third = receive(second.state, alert('third'));
    const flushed = reducePushHoldQueue(third.state, { type: 'presence', foreground: false });

    expect(flushed.surfaced).toEqual([{ id: 'first' }, { id: 'second' }, { id: 'third' }]);
  });

  it('surfaces a new alert immediately when already in the background', () => {
    const result = receive(enabledState(false), alert('background-alert'));

    expect(result.surfaced).toEqual([{ id: 'background-alert' }]);
    expect(result.state.held).toEqual([]);
  });

  it('stays inert when push or presence capability is absent', () => {
    expect(pushHoldCapabilityAvailable(undefined)).toBe(false);
    expect(pushHoldCapabilityAvailable({ push: true, presence: false })).toBe(false);

    const state = createPushHoldQueueState(undefined);
    const received = receive(state, alert('unsupported-alert'));
    const background = reducePushHoldQueue(received.state, { type: 'presence', foreground: false });

    expect(received.surfaced).toEqual([]);
    expect(received.state.held).toEqual([]);
    expect(background.surfaced).toEqual([]);
    expect(background.state.held).toEqual([]);
  });

  it('produces nothing for an absent alert fixture', () => {
    const result = receive(enabledState(), undefined);

    expect(result.surfaced).toEqual([]);
    expect(result.state.held).toEqual([]);
  });
});
