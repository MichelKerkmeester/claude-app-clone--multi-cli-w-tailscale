import { useEffect, useState } from 'react';

import type { ArtifactResourceStatus } from './useArtifactResource.js';
import type { ArtifactViewerPhase } from './ArtifactViewerProvider.js';

export interface ArtifactStatusProps {
  readonly phase: ArtifactViewerPhase;
  readonly status?: ArtifactResourceStatus | null;
  readonly subject?: string;
  readonly announcement?: string | null;
  readonly terminalMessage?: string | null;
}

function statusMessage(
  phase: ArtifactViewerPhase,
  status: ArtifactResourceStatus | null | undefined,
  subject: string,
): string {
  if (phase === 'opening') return `Opening ${subject}.`;
  if (phase === 'exiting') return `Closing ${subject}.`;
  if (status === undefined || status === null) return `${subject} ready.`;
  switch (status) {
    case 'idle':
      return `${subject} is waiting to load.`;
    case 'loading':
      return `Loading ${subject}.`;
    case 'stalled':
      return `${subject} is taking longer than expected.`;
    case 'ready':
      return `${subject} ready.`;
    case 'empty':
      return `${subject} is empty.`;
    case 'whitespace':
      return `${subject} contains whitespace only.`;
    case 'offline':
      return `${subject} is unavailable while the relay is offline.`;
    case 'stale':
      return `${subject} is stale. Choose View latest to request the same exact revision again.`;
    case 'denied':
      return `${subject} access was denied.`;
    case 'expired':
      return `${subject} has expired.`;
    case 'missing':
      return `${subject} is missing.`;
    case 'revoked':
      return `${subject} was revoked.`;
    case 'conflict':
      return `${subject} has a revision conflict.`;
    case 'corrupt':
      return `${subject} failed verification.`;
    case 'too-large':
      return `${subject} is too large to preview.`;
    case 'rate-limited':
      return `${subject} is temporarily rate limited.`;
    case 'relay-error':
      return `The relay could not provide ${subject}.`;
    case 'aborted':
      return `${subject} loading was cancelled.`;
    case 'closed':
      return `${subject} is closed.`;
  }
}

export function ArtifactStatus({
  phase,
  status,
  subject = 'Redacted file diff',
  announcement = null,
  terminalMessage = null,
}: ArtifactStatusProps) {
  const message = announcement ?? statusMessage(phase, status, subject);
  const [announcedMessage, setAnnouncedMessage] = useState(message);
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncedMessage(message), 0);
    return () => window.clearTimeout(timer);
  }, [message]);
  return (
    <>
      <div className="artifact-viewer-status" role="status" aria-live="polite" aria-atomic="true">
        {announcedMessage}
      </div>
      {terminalMessage !== null && (
        <div
          className="artifact-viewer-terminal-alert"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {terminalMessage}
        </div>
      )}
    </>
  );
}
