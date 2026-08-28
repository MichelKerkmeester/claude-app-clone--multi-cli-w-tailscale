// ───────────────────────────────────────────────────────────────────
// MODULE: State-scoped Latched Dismiss
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface LatchedDismiss<State> {
  readonly dismiss: (state: State) => void;
  readonly isVisible: (state: State) => boolean;
}

// ───────────────────────────────────────────────────────────────────
// 2. LATCH
// ───────────────────────────────────────────────────────────────────

/** Hide a row for its current state, releasing it only after a real state change. */
export function createLatchedDismiss<State>(): LatchedDismiss<State> {
  let hasDismissedState = false;
  let dismissedState: State;

  return {
    dismiss: (state) => {
      dismissedState = state;
      hasDismissedState = true;
    },
    isVisible: (state) => {
      if (!hasDismissedState) return true;
      if (Object.is(dismissedState, state)) return false;
      hasDismissedState = false;
      return true;
    },
  };
}
