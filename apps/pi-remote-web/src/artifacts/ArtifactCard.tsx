import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';
import { useRef } from 'react';
import { Button } from 'react-aria-components';

import { useOptionalArtifactViewer } from './ArtifactViewerProvider.js';

const PEEK_LINE_COUNT = 6;

export interface ArtifactCardProps {
  readonly block: FileDiffBlock;
}

export function ArtifactCard({ block }: ArtifactCardProps) {
  // @ds surface: artifact-card — the in-transcript read-only card that opens the diff viewer.
  // @ds slot: glyph | body (meta · summary · peek) | open — the card chrome regions.
  // @ds guardrail: do-not-edit — react-aria Button + onPress opening the viewer are frozen.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const viewer = useOptionalArtifactViewer();
  const patchLines = block.patch.split('\n');
  const peekLines = Array.from({ length: PEEK_LINE_COUNT }, (_, index) => patchLines[index] ?? '');

  return (
    <Button
      ref={buttonRef}
      type="button"
      className="artifact-card"
      aria-label={`Open file diff: ${block.summary}`}
      onPress={() => viewer?.openDiff(block, buttonRef.current)}
    >
      <span className="artifact-card-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M5 7h14M5 12h14M5 17h8" />
          <path d="M16 15v6M13 18h6" />
        </svg>
      </span>
      <span className="artifact-card-body">
        <span className="artifact-card-meta">
          <span>File diff</span>
          <span>Read-only</span>
        </span>
        <span className="artifact-card-summary">{block.summary}</span>
        {/* @ds slot: peek — the clipped 6-line diff preview (mayReorder content only). */}
        <span className="artifact-card-peek" aria-label="Diff preview">
          {peekLines.map((line, index) => (
            <span className="artifact-card-peek-line" key={`${index}-${line.slice(0, 12)}`}>
              {line || ' '}
              {index < peekLines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </span>
      </span>
      <span className="artifact-card-open" aria-hidden="true">
        Open
      </span>
    </Button>
  );
}
