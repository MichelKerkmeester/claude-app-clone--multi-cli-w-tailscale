import { Button, Heading } from 'react-aria-components';
import type { RefObject } from 'react';

export interface ArtifactHeaderProps {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onClose: () => void;
}

export function ArtifactHeader({ headingRef, onClose }: ArtifactHeaderProps) {
  return (
    <header className="artifact-viewer-header">
      <div className="artifact-viewer-heading-group">
        <span className="artifact-viewer-kicker">Redacted artifact</span>
        <Heading ref={headingRef} slot="title" tabIndex={-1} className="artifact-viewer-title">
          File diff
        </Heading>
      </div>
      <Button
        type="button"
        className="artifact-viewer-close"
        aria-label="Close file diff viewer"
        onPress={onClose}
      >
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </Button>
    </header>
  );
}
