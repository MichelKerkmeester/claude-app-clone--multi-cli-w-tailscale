// ───────────────────────────────────────────────────────────────────
// MODULE: PUSH EDGE-TICK POLICY
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type PushEventKind = 'edge' | 'tick';

export interface PushEvent<TPayload = unknown> {
  readonly kind: PushEventKind;
  readonly at: number;
  readonly payload?: TPayload;
}

export interface PushDeliveryPolicy {
  readonly delivery: 'immediate' | 'coalesced';
  readonly priority: 'high' | 'low';
}

export interface PushDelivery<TPayload = unknown> extends PushDeliveryPolicy {
  readonly event: PushEvent<TPayload>;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const DEFAULT_TICK_COALESCE_WINDOW_MS = 10_000;

// ───────────────────────────────────────────────────────────────────
// 3. CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

/** Keep edge notifications responsive while allowing routine progress to wait for batching. */
export function classifyPushEvent(event: PushEvent): PushDeliveryPolicy {
  return event.kind === 'edge'
    ? { delivery: 'immediate', priority: 'high' }
    : { delivery: 'coalesced', priority: 'low' };
}

// ───────────────────────────────────────────────────────────────────
// 4. SCHEDULING
// ───────────────────────────────────────────────────────────────────

/** Build a delivery plan without timers or device state so callers can apply it at the boundary. */
export function schedulePushDeliveries<TPayload>(
  events: readonly PushEvent<TPayload>[],
  tickWindowMs: number = DEFAULT_TICK_COALESCE_WINDOW_MS,
): readonly PushDelivery<TPayload>[] {
  if (!Number.isFinite(tickWindowMs) || tickWindowMs <= 0) {
    throw new RangeError('The tick coalescing window must be greater than zero.');
  }

  const deliveries: PushDelivery<TPayload>[] = [];
  let pendingTick: PushEvent<TPayload> | undefined;

  const flushPendingTick = (): void => {
    if (pendingTick === undefined) return;
    deliveries.push({ event: pendingTick, ...classifyPushEvent(pendingTick) });
    pendingTick = undefined;
  };

  for (const event of events) {
    if (event.kind === 'edge') {
      flushPendingTick();
      deliveries.push({ event, ...classifyPushEvent(event) });
      continue;
    }

    if (pendingTick === undefined || event.at - pendingTick.at >= tickWindowMs) {
      flushPendingTick();
    }
    pendingTick = event;
  }

  flushPendingTick();
  return deliveries;
}
