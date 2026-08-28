// MODULE: Notification tap route

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface NotificationTapPayload {
  hostId?: string;
  sessionId?: string;
  recoveryHint?: string;
}

export interface NotificationTapRouteInput {
  payload?: NotificationTapPayload;
  knownHostIds?: ReadonlySet<string>;
}

export type NotificationTapDecision =
  | {
      kind: 'refused';
      reason: 'malformed-payload' | 'host-capability-unavailable' | 'unknown-host';
    }
  | {
      kind: 'recovery';
      hostId: string;
      sessionId: string;
      recoveryHint: string;
    }
  | {
      kind: 'session';
      hostId: string;
      sessionId: string;
    };

// ───────────────────────────────────────────────────────────────────
// 2. ROUTING
// ───────────────────────────────────────────────────────────────────

// Refuses a tap when host identity cannot be proven instead of guessing a paired destination.
export function routeNotificationTap(input: NotificationTapRouteInput): NotificationTapDecision {
  const { payload, knownHostIds } = input;

  if (!knownHostIds) {
    return { kind: 'refused', reason: 'host-capability-unavailable' };
  }

  if (
    !payload ||
    typeof payload.hostId !== 'string' ||
    payload.hostId.trim().length === 0 ||
    typeof payload.sessionId !== 'string' ||
    payload.sessionId.trim().length === 0 ||
    (payload.recoveryHint !== undefined &&
      (typeof payload.recoveryHint !== 'string' || payload.recoveryHint.trim().length === 0))
  ) {
    return { kind: 'refused', reason: 'malformed-payload' };
  }

  if (!knownHostIds.has(payload.hostId)) {
    return { kind: 'refused', reason: 'unknown-host' };
  }

  if (payload.recoveryHint !== undefined) {
    return {
      kind: 'recovery',
      hostId: payload.hostId,
      sessionId: payload.sessionId,
      recoveryHint: payload.recoveryHint,
    };
  }

  return {
    kind: 'session',
    hostId: payload.hostId,
    sessionId: payload.sessionId,
  };
}
