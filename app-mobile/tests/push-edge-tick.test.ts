// ───────────────────────────────────────────────────────────────────
// MODULE: PUSH EDGE-TICK TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  classifyPushEvent,
  schedulePushDeliveries,
  type PushEvent,
} from '../src/shared/format/push-edge-tick.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function edge(at: number, value: string): PushEvent<string> {
  return { kind: 'edge', at, payload: value };
}

function tick(at: number, value: string): PushEvent<string> {
  return { kind: 'tick', at, payload: value };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('push edge-versus-tick policy', () => {
  it('classifies an edge as an immediate high-priority delivery', () => {
    expect(classifyPushEvent(edge(1_000, 'attention-changed'))).toEqual({
      delivery: 'immediate',
      priority: 'high',
    });
  });

  it('coalesces several ticks in one window to the newest low-priority delivery', () => {
    const deliveries = schedulePushDeliveries(
      [tick(1_000, 'progress-10'), tick(2_000, 'progress-20'), tick(3_000, 'progress-30')],
      5_000,
    );

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      event: tick(3_000, 'progress-30'),
      delivery: 'coalesced',
      priority: 'low',
    });
  });

  it('keeps an edge as its own immediate delivery between tick windows', () => {
    const edgeEvent = edge(2_000, 'needs-input');
    const deliveries = schedulePushDeliveries(
      [tick(1_000, 'progress-10'), edgeEvent, tick(3_000, 'progress-20')],
      5_000,
    );

    expect(deliveries.map(({ event }) => event.kind)).toEqual(['tick', 'edge', 'tick']);
    expect(deliveries[1]).toMatchObject({
      event: edgeEvent,
      delivery: 'immediate',
      priority: 'high',
    });
  });
});
