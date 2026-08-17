import type { ArtifactViewerPhase } from './ArtifactViewerProvider.js';

export interface ArtifactStatusProps {
  readonly phase: ArtifactViewerPhase;
}

export function ArtifactStatus({ phase }: ArtifactStatusProps) {
  const message =
    phase === 'opening'
      ? 'Opening redacted file diff.'
      : phase === 'exiting'
        ? 'Closing file diff viewer.'
        : 'Redacted file diff ready.';
  return (
    <div className="artifact-viewer-status" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
