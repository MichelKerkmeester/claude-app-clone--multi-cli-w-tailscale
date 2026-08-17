import { Button } from 'react-aria-components';

import type { NormalizedCodeBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';

export interface CodeCardProps {
  readonly block: NormalizedCodeBlock;
  readonly onOpen?: () => void;
}

const PREVIEW_LINES = 12;

export function CodeCard({ block, onOpen }: CodeCardProps) {
  const feedback = useCopyFeedback();
  const lines = displayLines(block.canonicalSource);
  const preview = lines.slice(0, PREVIEW_LINES).join('\n');
  const canOpen = block.canonicalSource.length > 0 && onOpen !== undefined;
  return (
    <RichBlockFrame
      title={block.languageLabel}
      eyebrow="Code"
      metadata={[
        `${lines.length} lines`,
        block.incomplete ? 'Incomplete fence' : 'Plain text',
      ]}
      redaction={block.redaction}
      className="rich-code-card"
      actions={
        feedback.canCopy || canOpen ? (
          <>
            {feedback.canCopy && (
              <Button
                className="rich-block-action"
                aria-label={feedback.actionLabel('code')}
                onPress={() => feedback.copy('code', block.canonicalSource)}
              >
                {feedback.actionLabel('code')}
              </Button>
            )}
            {canOpen && (
              <Button className="rich-block-action" onPress={onOpen}>
                Open full screen
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="rich-code-preview" data-code-pan="true">
        <pre aria-label={`${block.languageLabel} code preview`}>
          <code>{preview}</code>
        </pre>
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

function displayLines(value: string): string[] {
  const lines = value.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}
