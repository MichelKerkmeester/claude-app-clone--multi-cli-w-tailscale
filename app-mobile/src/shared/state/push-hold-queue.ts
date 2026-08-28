// ───────────────────────────────────────────────────────────────────
// MODULE: Presence-aware Push Hold Queue
// ───────────────────────────────────────────────────────────────────

// Push and presence are host capabilities. Until both are explicitly
// available, this state machine remains inert instead of guessing either one.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface PushHoldCapabilities {
  readonly push: boolean;
  readonly presence: boolean;
}

export interface PushHoldAlert {
  readonly id: string;
}

export interface PushHoldQueueState {
  readonly enabled: boolean;
  readonly foreground: boolean;
  readonly held: readonly PushHoldAlert[];
}

export type PushHoldQueueAction =
  | { readonly type: 'receive'; readonly alert: PushHoldAlert | null | undefined }
  | { readonly type: 'presence'; readonly foreground: boolean }
  | { readonly type: 'resolve'; readonly id: string };

export interface PushHoldQueueTransition {
  readonly state: PushHoldQueueState;
  readonly surfaced: readonly PushHoldAlert[];
}

// ───────────────────────────────────────────────────────────────────
// 2. CAPABILITY AND STATE
// ───────────────────────────────────────────────────────────────────

/** Both host capabilities are required before a push can be held or shown. */
export function pushHoldCapabilityAvailable(
  capabilities: PushHoldCapabilities | null | undefined,
): boolean {
  return capabilities?.push === true && capabilities.presence === true;
}

/** Create an inert state when the host has not supplied the required contract. */
export function createPushHoldQueueState(
  capabilities?: PushHoldCapabilities | null,
  foreground = true,
): PushHoldQueueState {
  return {
    enabled: pushHoldCapabilityAvailable(capabilities),
    foreground,
    held: [],
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TRANSITIONS
// ───────────────────────────────────────────────────────────────────

function isAlert(value: unknown): value is PushHoldAlert {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.length > 0;
}

function unchanged(state: PushHoldQueueState): PushHoldQueueTransition {
  return { state, surfaced: [] };
}

/**
 * Hold alerts in foreground, surface them in arrival order on background,
 * and remove resolved alerts before a flush can expose stale work.
 */
export function reducePushHoldQueue(
  current: PushHoldQueueState,
  action: PushHoldQueueAction | null | undefined,
): PushHoldQueueTransition {
  if (!current.enabled || action === null || action === undefined) return unchanged(current);

  if (action.type === 'receive') {
    if (!isAlert(action.alert)) return unchanged(current);
    if (!current.foreground) return { state: current, surfaced: [action.alert] };
    return {
      state: { ...current, held: [...current.held, action.alert] },
      surfaced: [],
    };
  }

  if (action.type === 'presence') {
    if (action.foreground) {
      if (current.foreground) return unchanged(current);
      return { state: { ...current, foreground: true }, surfaced: [] };
    }
    if (!current.foreground) return unchanged(current);
    return {
      state: { ...current, foreground: false, held: [] },
      surfaced: current.held,
    };
  }

  if (action.type === 'resolve') {
    if (typeof action.id !== 'string' || action.id.length === 0) return unchanged(current);
    const held = current.held.filter((alert) => alert.id !== action.id);
    if (held.length === current.held.length) return unchanged(current);
    return { state: { ...current, held }, surfaced: [] };
  }

  return unchanged(current);
}
