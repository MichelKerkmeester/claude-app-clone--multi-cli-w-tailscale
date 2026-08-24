<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { NormalizedCommandBlock } from './normalize-transcript-blocks.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface CommandSnapshot {
    readonly blockId: string;
    readonly revision: number;
    readonly command: string | null;
    readonly output: string | null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // The pure reconciliation helper is exported for deterministic streaming tests.
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
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import RichBlockFrame from './rich-block-frame.svelte';
  import { useCopyFeedback } from './use-copy-feedback.svelte.js';
  import { hover } from '$shared/primitives/a11y/interactions.js';

  interface Props {
    block: NormalizedCommandBlock;
    onOpen?: (trigger?: HTMLButtonElement | null) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, onOpen }: Props = $props();

  const OUTPUT_PREVIEW_LINES = 8;

  const feedback = useCopyFeedback();

  let previousSnapshot: CommandSnapshot | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let openButton = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const snapshot = $derived.by(() => {
    const next = reconcileCommandSnapshot(previousSnapshot, block);
    previousSnapshot = next;
    return next;
  });

  const output = $derived(snapshot.output);
  const command = $derived(snapshot.command);
  const outputLines = $derived(output === null ? [] : displayLines(output));
  const previewLines = $derived(outputLines.slice(-OUTPUT_PREVIEW_LINES));
  const clippedLines = $derived(Math.max(0, outputLines.length - previewLines.length));
  const outputUnit = $derived(block.outputCompleteness === 'complete' ? 'output' : 'current output');
  const lifecycleLabel = $derived(lifecycleText(block.lifecycle));
  const canOpen = $derived(command !== null || output !== null);
  const showingLastTrustworthySnapshot = $derived(
    block.canonicalOutput === null && snapshot.output !== null,
  );
  const stateLabels = $derived(
    [
      block.source === 'cache' ? 'Stale cache' : null,
      block.source === 'cache' && block.lifecycle === 'running' ? 'Connection lost' : null,
      block.resultMissing || (block.terminalCheckpoint === 'terminal' && output === null)
        ? 'Terminal without result'
        : null,
      showingLastTrustworthySnapshot ? 'Last trustworthy snapshot' : null,
    ].filter((label): label is string => label !== null),
  );

  // ───────────────────────────────────────────────────────────────────
  // 8. HELPERS
  // ───────────────────────────────────────────────────────────────────

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
    const result = value.split(/\r?\n/u);
    if (result.at(-1) === '') result.pop();
    return result;
  }
</script>

{#snippet actionsSnippet()}
  <!-- @ds slot: actions — unit Copy commands + full-screen Open handoff. -->
  <!-- @ds guardrail: do-not-edit — The exact-copy clipboard boundary; Open is a pass-through with no fetch/endpoint/ticket/download/host-file read. -->
  {#if feedback.canCopy && command !== null}
    <button
      class="rich-block-action"
      use:hover
      aria-label={feedback.actionLabel('command')}
      onclick={() => feedback.copy('command', command)}
    >{feedback.actionLabel('command')}</button>
  {/if}
  {#if feedback.canCopy && output !== null}
    <button
      class="rich-block-action"
      use:hover
      aria-label={feedback.actionLabel(outputUnit)}
      onclick={() => feedback.copy(outputUnit, output)}
    >{feedback.actionLabel(outputUnit)}</button>
  {/if}
  {#if canOpen && onOpen !== undefined}
    <button class="rich-block-action" use:hover bind:this={openButton} onclick={() => onOpen?.(openButton)}
      >Open full screen</button>
  {/if}
{/snippet}

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
  class="rich-command-card"
  {...(feedback.canCopy || canOpen ? { actions: actionsSnippet } : {})}
>
  <!-- @ds slot: command — labelled command region. -->
  <section class="rich-command-region" aria-labelledby={`${block.blockId}-command`}>
    <h4 id={`${block.blockId}-command`}>Command</h4>
    <pre class="rich-shell-well"><code>{command ?? 'Waiting for command'}</code></pre>
  </section>
  <!-- @ds slot: output — labelled output region. -->
  <section class="rich-command-region" aria-labelledby={`${block.blockId}-output`}>
    <div class="rich-command-region-heading">
      <h4 id={`${block.blockId}-output`}>Output</h4>
      {#if clippedLines > 0}<span class="rich-clipped-count">{clippedLines} earlier lines clipped</span>{/if}
    </div>
    <!-- @ds state: running-tail — data-tail-first anchors the newest output at the
         bottom while a command streams; completed output is read top-down.
         @ds guardrail: do-not-edit — The data attribute and tail window are behavior owned by the running/streaming model. -->
    <pre class="rich-shell-well rich-output-preview" data-tail-first="true"><code>{previewLines.length > 0 ? previewLines.join('\n') : 'No output yet'}</code></pre>
    <p class="rich-output-meta">{outputLines.length} lines · {outputCompletenessText(block.outputCompleteness)}{showingLastTrustworthySnapshot ? ' · Last trustworthy redacted snapshot' : ''}</p>
  </section>
  <!-- @ds guardrail: do-not-edit — Polite live region announcing Copy outcomes. -->
  <p class="rich-copy-status" role="status" aria-live="polite">{feedback.announcement}</p>
</RichBlockFrame>

<style>
  /* @ds surface: command-output-card — Bash command + output preview with unit
     Copy and a full-screen Open handoff. */
  /* @ds slot: output — vertical spacing between the command and output regions. */
  .rich-command-region + .rich-command-region {
    margin-block-start: var(--space-4);
  }

  /* @ds slot: output-heading — Output title + earlier-lines-clipped count row. */
  .rich-command-region-heading {
    justify-content: space-between;
    margin-block-end: var(--space-2);
  }

  /* @ds slot: label — Command / Output region subheadings. */
  .rich-command-region h4 {
    font-size: 0.8125rem;
  }

  /* @ds slot: output-preview — tail-window preview of command output. */
  .rich-output-preview {
    block-size: 8.5rem;
    contain: content;
  }

  /* @ds slot: labels — clipped-count and output-meta share muted small type. */
  .rich-clipped-count {
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  .rich-output-meta {
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* @ds state: copy — success · failure · unavailable. The Copy announcer line is a
     polite live region whose text carries the outcome; the presence styles are this. */
  /* @ds guardrail: do-not-edit — role="status" aria-live="polite" live region. */
  .rich-copy-status {
    min-block-size: 1.25rem;
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
  }
</style>
