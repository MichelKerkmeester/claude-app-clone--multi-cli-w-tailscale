// MODULE: Notification tap route tests

import { describe, expect, it } from 'vitest';

import { routeNotificationTap } from '../src/shared/format/notification-tap-route';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const knownHostIds = new Set(['host-known']);

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('routeNotificationTap', () => {
  it('refuses a payload for an unknown host', () => {
    const result = routeNotificationTap({
      knownHostIds,
      payload: { hostId: 'host-unknown', sessionId: 'session-1' },
    });

    expect(result).toEqual({ kind: 'refused', reason: 'unknown-host' });
  });

  it('refuses a malformed payload', () => {
    const result = routeNotificationTap({
      knownHostIds,
      payload: { hostId: 'host-known' },
    });

    expect(result).toEqual({ kind: 'refused', reason: 'malformed-payload' });
  });

  it('routes a credential-recovery hint to recovery', () => {
    const result = routeNotificationTap({
      knownHostIds,
      payload: {
        hostId: 'host-known',
        sessionId: 'session-1',
        recoveryHint: 'credential-recovery',
      },
    });

    expect(result).toEqual({
      kind: 'recovery',
      hostId: 'host-known',
      sessionId: 'session-1',
      recoveryHint: 'credential-recovery',
    });
  });

  it('routes a valid known-host payload to its session', () => {
    const result = routeNotificationTap({
      knownHostIds,
      payload: { hostId: 'host-known', sessionId: 'session-1' },
    });

    expect(result).toEqual({
      kind: 'session',
      hostId: 'host-known',
      sessionId: 'session-1',
    });
  });

  it('refuses taps when known-host capability is absent', () => {
    const result = routeNotificationTap({
      payload: { hostId: 'host-known', sessionId: 'session-1' },
    });

    expect(result).toEqual({ kind: 'refused', reason: 'host-capability-unavailable' });
  });
});
