// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Cleanup Queue
// ───────────────────────────────────────────────────────────────────

// Unconfirmed device actions stay on this device until a later confirmed
// request removes them. The queue never carries host data or credentials.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type DeviceCleanupAction = 'logout' | 'revoke';

export interface DeviceCleanupQueueState {
  readonly available: boolean;
  readonly pending: readonly DeviceCleanupAction[];
}

type CleanupQueueListener = (state: DeviceCleanupQueueState) => void;

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pi-remote.device-cleanup';
const ACTIONS: readonly DeviceCleanupAction[] = ['logout', 'revoke'];
const listeners = new Set<CleanupQueueListener>();

// ───────────────────────────────────────────────────────────────────
// 3. STORAGE
// ───────────────────────────────────────────────────────────────────

function emptyQueue(available: boolean): DeviceCleanupQueueState {
  return { available, pending: [] };
}

function isAction(value: unknown): value is DeviceCleanupAction {
  return ACTIONS.includes(value as DeviceCleanupAction);
}

function readStoredQueue(): DeviceCleanupQueueState {
  if (typeof window === 'undefined') return emptyQueue(false);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return emptyQueue(true);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isAction)) return emptyQueue(false);
    return { available: true, pending: [...new Set(parsed)] };
  } catch {
    return emptyQueue(false);
  }
}

function persistQueue(pending: readonly DeviceCleanupAction[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

function publish(next: DeviceCleanupQueueState): void {
  queue = next;
  for (const listener of listeners) listener(queue);
}

// ───────────────────────────────────────────────────────────────────
// 4. QUEUE API
// ───────────────────────────────────────────────────────────────────

let queue = readStoredQueue();

/** Read the current device-local cleanup state. */
export function deviceCleanupQueue(): DeviceCleanupQueueState {
  return queue;
}

/** Re-read storage when a surface starts so reloads never trust stale memory. */
export function rehydrateDeviceCleanupQueue(): DeviceCleanupQueueState {
  publish(readStoredQueue());
  return queue;
}

/** Listen for queue changes made by authentication or another local surface. */
export function subscribeDeviceCleanupQueue(listener: CleanupQueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Add an action only after the durable device-local write succeeds. */
export function enqueueDeviceCleanup(action: DeviceCleanupAction): boolean {
  if (!isAction(action) || !queue.available || queue.pending.includes(action)) return false;

  const pending = [...queue.pending, action];
  if (!persistQueue(pending)) {
    publish({ available: false, pending: queue.pending });
    return false;
  }
  publish({ available: true, pending });
  return true;
}

/** Remove an action only after its request has been confirmed. */
export function completeDeviceCleanup(action: DeviceCleanupAction): boolean {
  if (!queue.pending.includes(action)) return true;

  const pending = queue.pending.filter((candidate) => candidate !== action);
  if (!persistQueue(pending)) return false;
  publish({ available: true, pending });
  return true;
}

/** Clear the queue for isolated device-local state tests and reset flows. */
export function clearDeviceCleanupQueue(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // An unavailable store cannot retain stale cleanup state.
    }
  }
  publish(readStoredQueue());
}

export { STORAGE_KEY as DEVICE_CLEANUP_STORAGE_KEY };
