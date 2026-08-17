import { useRef } from 'react';
import { Button } from 'react-aria-components';

import type { NormalizedTextArtifactBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';

export interface TextArtifactCardProps {
  readonly block: NormalizedTextArtifactBlock;
  readonly onOpen?: (trigger?: HTMLButtonElement | null) => void;
}

const PREVIEW_LINES = 6;

export function TextArtifactCard({ block, onOpen }: TextArtifactCardProps) {
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
      <div className="rich-text-artifact-preview">
        <pre>{preview}</pre>
      </div>
      {lines.length > PREVIEW_LINES && (
        <p className="rich-continuation">{lines.length - PREVIEW_LINES} more lines</p>
      )}
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
