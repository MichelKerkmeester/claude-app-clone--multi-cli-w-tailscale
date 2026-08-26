// ───────────────────────────────────────────────────────────────────
// MODULE: Copy-to-Clipboard Feedback
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const COPY_FAILURE_MESSAGE = 'Copy failed. Touch and hold to select the text.';
export const HOLD_TO_SELECT_HINT = 'Hold to select text.';
export const HOLD_TO_SELECT_STORAGE_KEY = 'pi-remote.hold-to-select-coach';
const COPY_CONFIRM_MS = 700;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface CopyFeedback {
  readonly canCopy: boolean;
  readonly copiedUnit: string | null;
  readonly copyFailed: boolean;
  readonly announcement: string;
  readonly copy: (unit: string, canonicalSource: string) => void;
  readonly actionLabel: (unit: string) => string;
}

// ───────────────────────────────────────────────────────────────────
// 3. QUANTIFIED RECEIPT
// ───────────────────────────────────────────────────────────────────

// Strip exactly one trailing newline so a whole-line copy is not off-by-one.
export function copiedReceipt(source: string): string | null {
  const trimmed = source.endsWith('\n') ? source.slice(0, -1) : source;
  if (trimmed.length === 0) return null;
  const lines = trimmed.split('\n');
  if (lines.length > 1) return `Copied ${lines.length} lines`;
  return `Copied ${trimmed.length} chars`;
}

// ───────────────────────────────────────────────────────────────────
// 4. HOLD-TO-SELECT COACH
// ───────────────────────────────────────────────────────────────────

export function readHoldToSelectCoachShown(): boolean {
  try {
    return globalThis.localStorage?.getItem(HOLD_TO_SELECT_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHoldToSelectCoachShown(): void {
  try {
    globalThis.localStorage?.setItem(HOLD_TO_SELECT_STORAGE_KEY, '1');
  } catch {
    // Private mode must not throw; the coach simply does not persist.
  }
}

// A drag that produced neither a copy nor a selection teaches the gesture once.
export function decideHoldToSelectCoach(input: {
  readonly copied: boolean;
  readonly selected: boolean;
  readonly alreadyShown?: boolean;
}): string | null {
  if (input.copied || input.selected) return null;
  if (input.alreadyShown === true) return null;
  return HOLD_TO_SELECT_HINT;
}

// ───────────────────────────────────────────────────────────────────
// 5. PUBLIC API
// ───────────────────────────────────────────────────────────────────

export function useCopyFeedback(): CopyFeedback {
  let copiedUnit = $state<string | null>(null);
  let copyFailed = $state(false);
  let announcement = $state('');

  function copy(unit: string, canonicalSource: string): void {
    const receipt = copiedReceipt(canonicalSource);
    if (receipt === null) {
      copiedUnit = null;
      copyFailed = false;
      announcement = '';
      return;
    }
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      return;
    }
    void navigator.clipboard.writeText(canonicalSource).then(
      () => {
        // One owner per confirm slot: success yields the quantified receipt.
        copyFailed = false;
        copiedUnit = unit;
        announcement = receipt;
        window.setTimeout(() => {
          if (copiedUnit === unit) copiedUnit = null;
        }, COPY_CONFIRM_MS);
      },
      () => {
        // Failure owns the slot; never leave a green receipt beside the error.
        copiedUnit = null;
        copyFailed = true;
        announcement = COPY_FAILURE_MESSAGE;
      },
    );
  }

  function actionLabel(unit: string): string {
    if (copyFailed) return `Copy ${unit}`;
    return copiedUnit === unit ? 'Copied' : `Copy ${unit}`;
  }

  return {
    get canCopy() {
      return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
    },
    get copiedUnit() {
      return copiedUnit;
    },
    get copyFailed() {
      return copyFailed;
    },
    get announcement() {
      return announcement;
    },
    copy,
    actionLabel,
  };
}
