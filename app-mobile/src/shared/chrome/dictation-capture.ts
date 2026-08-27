// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Capture State Machine
// ───────────────────────────────────────────────────────────────────
// Pure state machine for dictation capture modes. Tracks whether the
// user is using tap-to-toggle (tap start, tap stop+insert) or press-and-
// hold walkie-talkie (hold to record, release to stop+insert). Distinguishes
// STOP (transcribe+insert) from CANCEL (discard). A hold shorter than
// 400 ms is treated as an accidental tap and cancels quietly.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** A hold shorter than this duration (ms) is treated as an accidental tap. */
export const ACCIDENTAL_TAP_MS = 400;

// ───────────────────────────────────────────────────────────────────
// 2. CAPTURE MODE
// ───────────────────────────────────────────────────────────────────

export type CaptureMode = 'toggle' | 'hold-to-talk';

// ───────────────────────────────────────────────────────────────────
// 3. STATE
// ───────────────────────────────────────────────────────────────────

export type CaptureState = 'idle' | 'recording' | 'stopping' | 'cancelled';

export interface CaptureStatus {
  readonly state: CaptureState;
  readonly elapsedMs: number;
  readonly mode: CaptureMode;
}

// ───────────────────────────────────────────────────────────────────
// 4. EVENTS
// ───────────────────────────────────────────────────────────────────

export type CaptureEvent =
  | { readonly type: 'START' }
  | { readonly type: 'RELEASE'; readonly holdDurationMs: number }
  | { readonly type: 'STOP' }
  | { readonly type: 'CANCEL' }
  | { readonly type: 'RESET' };

// ───────────────────────────────────────────────────────────────────
// 5. STATE MACHINE
// ───────────────────────────────────────────────────────────────────

/**
 * Pure state machine for dictation capture.
 *
 * - START: begins recording. In toggle mode, a subsequent START while
 *   recording is a no-op. In hold-to-talk mode, START is the press.
 * - RELEASE: only meaningful in hold-to-talk mode. If holdDurationMs <
 *   400 ms, the release is treated as an accidental tap → cancelled.
 *   Otherwise, stop and ready for insert.
 * - STOP: explicit stop → transcribe+insert path.
 * - CANCEL: discard the take.
 * - RESET: return to idle.
 *
 * STOP ≠ CANCEL: stopping leads to 'stopping' (ready for transcribe+insert),
 * while CANCEL leads to 'cancelled' (discard). Both are terminal until RESET.
 */
export function transitionCapture(
  state: CaptureState,
  event: CaptureEvent,
  mode: CaptureMode,
): CaptureState {
  switch (state) {
    case 'idle':
      if (event.type === 'START') return 'recording';
      return 'idle';

    case 'recording':
      switch (event.type) {
        case 'START':
          // In toggle mode, a tap while recording means stop.
          if (mode === 'toggle') return 'stopping';
          return 'recording'; // hold-to-talk ignores a second press
        case 'RELEASE': {
          if (mode === 'hold-to-talk') {
            const holdMs = event.holdDurationMs;
            if (holdMs < ACCIDENTAL_TAP_MS) return 'cancelled';
            return 'stopping';
          }
          // In toggle mode, RELEASE is not meaningful (the user taps).
          return 'recording';
        }
        case 'STOP':
          return 'stopping';
        case 'CANCEL':
          return 'cancelled';
        default:
          return 'recording';
      }

    case 'stopping':
      // STOP stays in stopping; only RESET moves on.
      if (event.type === 'RESET') return 'idle';
      return 'stopping';

    case 'cancelled':
      // CANCEL stays in cancelled; only RESET moves on.
      if (event.type === 'RESET') return 'idle';
      return 'cancelled';
  }
}

/**
 * Determine whether the current state leads to an insert (transcribe+insert)
 * vs a discard. STOP → true (insert), CANCEL → false (discard).
 */
export function isInsertable(state: CaptureState): boolean {
  return state === 'stopping';
}

/**
 * Human-readable label for the current capture state.
 */
export function captureStateLabel(state: CaptureState): string {
  switch (state) {
    case 'idle':
      return 'Ready';
    case 'recording':
      return 'Recording';
    case 'stopping':
      return 'Processing';
    case 'cancelled':
      return 'Cancelled';
  }
}