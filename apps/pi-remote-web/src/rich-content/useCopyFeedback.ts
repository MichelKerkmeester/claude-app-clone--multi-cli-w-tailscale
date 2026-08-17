import { useCallback, useMemo, useState } from 'react';

export const COPY_FAILURE_MESSAGE = 'Copy failed. Touch and hold to select the text.';

export interface CopyFeedback {
  readonly canCopy: boolean;
  readonly copiedUnit: string | null;
  readonly announcement: string;
  readonly copy: (unit: string, canonicalSource: string) => void;
  readonly actionLabel: (unit: string) => string;
}

export function useCopyFeedback(): CopyFeedback {
  const [copiedUnit, setCopiedUnit] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const canCopy =
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function';

  const copy = useCallback((unit: string, canonicalSource: string) => {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.clipboard?.writeText !== 'function'
    ) {
      return;
    }
    void navigator.clipboard.writeText(canonicalSource).then(
      () => {
        setCopiedUnit(unit);
        setAnnouncement(`Copied ${unit}`);
        window.setTimeout(() => setCopiedUnit((current) => (current === unit ? null : current)), 1_500);
      },
      () => {
        setCopiedUnit(null);
        setAnnouncement(COPY_FAILURE_MESSAGE);
      },
    );
  }, []);

  const actionLabel = useCallback(
    (unit: string) => (copiedUnit === unit ? 'Copied' : `Copy ${unit}`),
    [copiedUnit],
  );

  return useMemo(
    () => ({ canCopy, copiedUnit, announcement, copy, actionLabel }),
    [actionLabel, announcement, canCopy, copiedUnit, copy],
  );
}
