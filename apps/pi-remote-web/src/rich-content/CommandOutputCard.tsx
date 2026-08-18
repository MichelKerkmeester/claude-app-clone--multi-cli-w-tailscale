import { useRef } from 'react';
import { Button } from 'react-aria-components';

import type { NormalizedCommandBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';

// @ds surface: command-output-card — Bash command + output preview with unit Copy
// and a full-screen Open handoff. Presentation lives in src/style.css under the
// same surface name; the reconciliation + clipboard + react-aria wiring below is
// guardrailed and not designer-editable.

// @ds guardrail: do-not-edit — reconcileCommandSnapshot is the pure streaming
// reconciliation contract that keeps the displayed snapshot stable and
// trustworthy; it is exported for deterministic tests. Not designer-editable.
export interface CommandOutputCardProps {
  readonly block: NormalizedCommandBlock;
  readonly onOpen?: (trigger?: HTMLButtonElement | null) => void;
}

const OUTPUT_PREVIEW_LINES = 8;

export interface CommandSnapshot {
  readonly blockId: string;
  readonly revision: number;
  readonly command: string | null;
  readonly output: string | null;
}

// The pure reconciliation helper is exported for deterministic streaming tests.
// eslint-disable-next-line react-refresh/only-export-components
export function reconcileCommandSnapshot(
  previous: CommandSnapshot | null,
  block: NormalizedCommandBlock,
): CommandSnapshot {
  const current: CommandSnapshot = {
    blockId: block.blockId,
    revision: block.revision,
    command: block.canonicalCommand,
    output: block.canonicalOutput,
  };
  if (
    previous !== null &&
    previous.blockId === current.blockId &&
    current.revision < previous.revision
  ) {
    return previous;
  }
  if (
    previous === null ||
    previous.blockId !== block.blockId ||
    (current.command !== null && current.command !== previous.command) ||
    (current.output !== null && current.output !== previous.output)
  ) {
    return current;
  }
  return {
    ...current,
    command: current.command ?? previous.command,
    output: current.output ?? previous.output,
  };
}

export function CommandOutputCard({ block, onOpen }: CommandOutputCardProps) {
  // @ds guardrail: do-not-edit — useCopyFeedback owns the exact-copy clipboard
  // boundary (availability gate, writeText, success/failure outcome text) and
  // the polite live region. This is the clipboard seam; do not change it.
  const feedback = useCopyFeedback();
  const snapshotRef = useRef<CommandSnapshot | null>(null);
  const snapshot = reconcileCommandSnapshot(snapshotRef.current, block);
  snapshotRef.current = snapshot;
  const output = snapshot.output;
  const command = snapshot.command;
  const outputLines = output === null ? [] : displayLines(output);
  const previewLines = outputLines.slice(-OUTPUT_PREVIEW_LINES);
  const clippedLines = Math.max(0, outputLines.length - previewLines.length);
  const outputUnit = block.outputCompleteness === 'complete' ? 'output' : 'current output';
  const lifecycleLabel = lifecycleText(block.lifecycle);
  const canOpen = command !== null || output !== null;
  const showingLastTrustworthySnapshot = block.canonicalOutput === null && snapshot.output !== null;
  const stateLabels = [
    block.source === 'cache' ? 'Stale cache' : null,
    block.source === 'cache' && block.lifecycle === 'running' ? 'Connection lost' : null,
    block.resultMissing || (block.terminalCheckpoint === 'terminal' && output === null)
      ? 'Terminal without result'
      : null,
    showingLastTrustworthySnapshot ? 'Last trustworthy snapshot' : null,
  ].filter((label): label is string => label !== null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <RichBlockFrame
      title="Bash command"
      eyebrow="Command / Output"
      metadata={[
        block.shellKind === 'bash' ? 'Bash' : 'Shell',
        `Call ${block.callId}`,
        `${outputLines.length} output lines`,
        ...stateLabels,
      ]}
      status={[...stateLabels, lifecycleLabel].join(' · ')}
      redaction={block.redaction}
      className="rich-command-card"
      actions={
        // @ds slot: actions — unit Copy commands + full-screen Open handoff.
        // @ds guardrail: do-not-edit — react-aria Button wiring (canCopy gating,
        // onPress, aria-label) and the clipboard handoff. The Open action is a
        // pass-through into the existing viewer: no fetch, endpoint, ticket,
        // download, or host-file read is added.
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
      {/* @ds slot: command — labelled command region. */}
      <section className="rich-command-region" aria-labelledby={`${block.blockId}-command`}>
        <h4 id={`${block.blockId}-command`}>Command</h4>
        <pre className="rich-shell-well">
          <code>{command ?? 'Waiting for command'}</code>
        </pre>
      </section>
      {/* @ds slot: output — labelled output region. */}
      <section className="rich-command-region" aria-labelledby={`${block.blockId}-output`}>
        <div className="rich-command-region-heading">
          <h4 id={`${block.blockId}-output`}>Output</h4>
          {clippedLines > 0 && (
            <span className="rich-clipped-count">{clippedLines} earlier lines clipped</span>
          )}
        </div>
        {/* @ds state: running-tail — data-tail-first anchors the newest output at
            the bottom while a command streams; completed output is read top-down.
            @ds guardrail: do-not-edit — the data attribute and tail window are
            behaviour owned by the running/streaming model. */}
        <pre className="rich-shell-well rich-output-preview" data-tail-first="true">
          <code>{previewLines.length > 0 ? previewLines.join('\n') : 'No output yet'}</code>
        </pre>
        <p className="rich-output-meta">
          {outputLines.length} lines · {outputCompletenessText(block.outputCompleteness)}
          {showingLastTrustworthySnapshot ? ' · Last trustworthy redacted snapshot' : ''}
        </p>
      </section>
      {/* @ds guardrail: do-not-edit — polite live region announcing Copy outcomes. */}
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

function outputCompletenessText(value: NormalizedCommandBlock['outputCompleteness']): string {
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
