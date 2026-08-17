import { Button } from 'react-aria-components';

import type { NormalizedCommandBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';

export interface CommandOutputCardProps {
  readonly block: NormalizedCommandBlock;
  readonly onOpen?: () => void;
}

const OUTPUT_PREVIEW_LINES = 8;

export function CommandOutputCard({ block, onOpen }: CommandOutputCardProps) {
  const feedback = useCopyFeedback();
  const output = block.canonicalOutput;
  const command = block.canonicalCommand;
  const outputLines = output === null ? [] : displayLines(output);
  const previewLines = outputLines.slice(-OUTPUT_PREVIEW_LINES);
  const clippedLines = Math.max(0, outputLines.length - previewLines.length);
  const outputUnit = block.outputCompleteness === 'complete' ? 'output' : 'current output';
  const lifecycleLabel = lifecycleText(block.lifecycle);
  const canOpen = command !== null || output !== null;

  return (
    <RichBlockFrame
      title="Bash command"
      eyebrow="Command / Output"
      metadata={[
        block.shellKind === 'bash' ? 'Bash' : 'Shell',
        `Call ${block.callId}`,
        `${outputLines.length} output lines`,
      ]}
      status={lifecycleLabel}
      redaction={block.redaction}
      className="rich-command-card"
      actions={
        feedback.canCopy || canOpen ? (
          <>
            {feedback.canCopy && command !== null && (
              <Button
                className="rich-block-action"
                aria-label={feedback.actionLabel('command')}
                onPress={() => feedback.copy('command', command)}
              >
                {feedback.actionLabel('command')}
              </Button>
            )}
            {feedback.canCopy && output !== null && (
              <Button
                className="rich-block-action"
                aria-label={feedback.actionLabel(outputUnit)}
                onPress={() => feedback.copy(outputUnit, output)}
              >
                {feedback.actionLabel(outputUnit)}
              </Button>
            )}
            {canOpen && onOpen !== undefined && (
              <Button className="rich-block-action" onPress={onOpen}>
                Open full screen
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <section className="rich-command-region" aria-labelledby={`${block.blockId}-command`}>
        <h4 id={`${block.blockId}-command`}>Command</h4>
        <pre className="rich-shell-well">
          <code>{command ?? 'Waiting for command'}</code>
        </pre>
      </section>
      <section className="rich-command-region" aria-labelledby={`${block.blockId}-output`}>
        <div className="rich-command-region-heading">
          <h4 id={`${block.blockId}-output`}>Output</h4>
          {clippedLines > 0 && (
            <span className="rich-clipped-count">{clippedLines} earlier lines clipped</span>
          )}
        </div>
        <pre className="rich-shell-well rich-output-preview" data-tail-first="true">
          <code>{previewLines.length > 0 ? previewLines.join('\n') : 'No output yet'}</code>
        </pre>
        <p className="rich-output-meta">
          {outputLines.length} lines · {outputCompletenessText(block.outputCompleteness)}
        </p>
      </section>
      <p className="rich-copy-status" role="status" aria-live="polite">
        {feedback.announcement}
      </p>
    </RichBlockFrame>
  );
}

function lifecycleText(value: NormalizedCommandBlock['lifecycle']): string {
  switch (value) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'denied':
      return 'Denied';
    case 'cancelled':
      return 'Cancelled';
    case 'interrupted':
      return 'Interrupted';
    case 'unknown':
      return 'Unknown';
  }
}

function outputCompletenessText(
  value: NormalizedCommandBlock['outputCompleteness'],
): string {
  switch (value) {
    case 'complete':
      return 'Complete';
    case 'upstream-truncated':
      return 'Upstream truncated';
    case 'unknown':
      return 'Current';
  }
}

function displayLines(value: string): string[] {
  const lines = value.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}
