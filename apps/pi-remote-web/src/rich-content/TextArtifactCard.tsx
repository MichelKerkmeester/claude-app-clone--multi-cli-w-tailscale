import { useRef } from 'react';
import { Button } from 'react-aria-components';

import type { NormalizedTextArtifactBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';

// @ds surface: text-artifact-card — substantial text artifact preview with a
// full-screen Open handoff. Presentation lives in src/style.css under the same
// surface name; the clipboard + react-aria wiring below is guardrailed and not
// designer-editable.

// @ds guardrail: do-not-edit — exact-copy clipboard boundary. The canonical source
// is written to the clipboard unaltered; the Open action is a pass-through into
// the existing viewer with no fetch, endpoint, ticket, download, or host-file read.
export interface TextArtifactCardProps {
  readonly block: NormalizedTextArtifactBlock;
  readonly onOpen?: (trigger?: HTMLButtonElement | null) => void;
}

const PREVIEW_LINES = 6;

export function TextArtifactCard({ block, onOpen }: TextArtifactCardProps) {
  // @ds guardrail: do-not-edit — exact-copy clipboard boundary (useCopyFeedback).
  const feedback = useCopyFeedback();
  const lines = displayLines(block.canonicalSource);
  const preview = lines.slice(0, PREVIEW_LINES).join('\n');
  const trustedLabel = textArtifactLabel(block.label);
  const canOpen = block.settled && block.canonicalSource.length > 0 && onOpen !== undefined;
  const openButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <RichBlockFrame
      title={trustedLabel}
      eyebrow="Text artifact"
      metadata={[`${lines.length} lines`, `${block.canonicalSource.length} characters`]}
      {...(block.label === 'long-text' ? { status: 'Long text' } : {})}
      redaction={block.redaction}
      className="rich-text-artifact-card"
      actions={
        // @ds slot: actions — Copy text + full-screen Open handoff.
        // @ds guardrail: do-not-edit — react-aria Button wiring and the exact-copy
        // clipboard boundary; Open is a pass-through with no fetch/endpoint/ticket/
        // download/host-file read.
        feedback.canCopy || canOpen ? (
          <>
            {feedback.canCopy && (
              <Button
                className="rich-block-action"
                aria-label={feedback.actionLabel('text')}
                onPress={() => feedback.copy('text', block.canonicalSource)}
              >
                {feedback.actionLabel('text')}
              </Button>
            )}
            {canOpen && (
              <Button
                ref={openButtonRef}
                className="rich-block-action"
                onPress={() => onOpen?.(openButtonRef.current)}
              >
                Open full screen
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {/* @ds slot: preview — clipped text-artifact preview column. */}
      <div className="rich-text-artifact-preview">
        <pre>{preview}</pre>
      </div>
      {lines.length > PREVIEW_LINES && (
        <p className="rich-continuation">{lines.length - PREVIEW_LINES} more lines</p>
      )}
      {/* @ds guardrail: do-not-edit — polite live region announcing Copy outcomes. */}
      <p className="rich-copy-status" role="status" aria-live="polite">
        {feedback.announcement}
      </p>
    </RichBlockFrame>
  );
}

function textArtifactLabel(value: NormalizedTextArtifactBlock['label']): string {
  switch (value) {
    case 'prompt':
      return 'Prompt';
    case 'goal':
      return 'Goal';
    case 'plan':
      return 'Plan';
    case 'document':
      return 'Document';
    case 'text':
      return 'Text';
    case 'long-text':
      return 'Long text';
  }
}

function displayLines(value: string): string[] {
  const lines = value.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}
