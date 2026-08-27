// ───────────────────────────────────────────────────────────────────
// MODULE: Race-timeout helper for connection establishment
// ───────────────────────────────────────────────────────────────────
// Races a pending promise (open/reconnect/enroll) against a close
// signal + a bounded timeout, and disposes the half-open resource on
// failure. Prevents a dead connection from hanging indefinitely.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const DEFAULT_RACE_TIMEOUT_MS = 60_000;

// ───────────────────────────────────────────────────────────────────
// 2. TYPES
// ───────────────────────────────────────────────────────────────────

export type RaceOutcome<T> =
  | { readonly state: 'fulfilled'; readonly value: T }
  | { readonly state: 'timed-out' }
  | { readonly state: 'aborted' };

export class RaceTimeoutError extends Error {
  readonly code: 'timed-out' | 'aborted';

  constructor(code: 'timed-out' | 'aborted') {
    super(code === 'timed-out' ? 'Operation timed out.' : 'Operation was aborted.');
    this.name = 'RaceTimeoutError';
    this.code = code;
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. RACE HELPER
// ───────────────────────────────────────────────────────────────────

/**
 * Race a pending promise against a close signal and a timeout.
 * On failure (timeout or abort), calls `dispose` if provided, then
 * rejects with a `RaceTimeoutError`.
 *
 * @param promise - The pending operation (open socket, enroll, etc.)
 * @param options - Close signal, timeout, and dispose callback
 * @returns The promise's value if it wins the race
 */
export function raceWithTimeout<T>(
  promise: Promise<T>,
  options: {
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly dispose?: () => void;
  } = {},
): Promise<T> {
  const { signal, timeoutMs = DEFAULT_RACE_TIMEOUT_MS, dispose } = options;

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal !== undefined) {
        signal.removeEventListener('abort', onAbort);
      }
      callback();
    };

    const onAbort = (): void => {
      finish(() => {
        dispose?.();
        reject(new RaceTimeoutError('aborted'));
      });
    };

    const timer = setTimeout(() => {
      finish(() => {
        dispose?.();
        reject(new RaceTimeoutError('timed-out'));
      });
    }, timeoutMs);

    if (signal !== undefined) {
      if (signal.aborted) {
        clearTimeout(timer);
        dispose?.();
        reject(new RaceTimeoutError('aborted'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    promise
      .then((value) => {
        finish(() => resolve(value));
      })
      .catch((error: unknown) => {
        finish(() => reject(error));
      });
  });
}