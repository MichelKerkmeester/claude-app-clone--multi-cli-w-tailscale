export const COPY_FAILURE_MESSAGE = 'Copy failed. Touch and hold to select the text.';

export interface CopyFeedback {
  readonly canCopy: boolean;
  readonly copiedUnit: string | null;
  readonly announcement: string;
  readonly copy: (unit: string, canonicalSource: string) => void;
  readonly actionLabel: (unit: string) => string;
}

export function useCopyFeedback(): CopyFeedback {
  let copiedUnit = $state<string | null>(null);
  let announcement = $state('');
  const canCopy =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

  function copy(unit: string, canonicalSource: string): void {
    if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
      return;
    }
    void navigator.clipboard.writeText(canonicalSource).then(
      () => {
        copiedUnit = unit;
        announcement = `Copied ${unit}`;
        window.setTimeout(() => {
          if (copiedUnit === unit) copiedUnit = null;
        }, 1_500);
      },
      () => {
        copiedUnit = null;
        announcement = COPY_FAILURE_MESSAGE;
      },
    );
  }

  function actionLabel(unit: string): string {
    return copiedUnit === unit ? 'Copied' : `Copy ${unit}`;
  }

  return {
    canCopy,
    get copiedUnit() {
      return copiedUnit;
    },
    get announcement() {
      return announcement;
    },
    copy,
    actionLabel,
  };
}
