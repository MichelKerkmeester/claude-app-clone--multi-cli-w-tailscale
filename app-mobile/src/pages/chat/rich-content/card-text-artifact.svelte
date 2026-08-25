<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { NormalizedTextArtifactBlock } from './normalize-transcript-blocks.js';
  import RichBlockFrame from './rich-block-frame.svelte';
  import { useCopyFeedback } from './use-copy-feedback.svelte.js';
  import { hover } from '$shared/primitives/a11y/interactions.js';

  interface Props {
    block: NormalizedTextArtifactBlock;
    onOpen?: (trigger?: HTMLButtonElement | null) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, onOpen }: Props = $props();

  const PREVIEW_LINES = 6;

  const feedback = useCopyFeedback();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let openButton = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const lines = $derived(displayLines(block.canonicalSource));
  const preview = $derived(lines.slice(0, PREVIEW_LINES).join('\n'));
  const trustedLabel = $derived(textArtifactLabel(block.label));
  const canOpen = $derived(
    block.settled && block.canonicalSource.length > 0 && onOpen !== undefined,
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

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
    const result = value.split(/\r?\n/u);
    if (result.at(-1) === '') result.pop();
    return result;
  }
</script>

{#snippet actionsSnippet()}
  <!-- @ds slot: actions — Copy text + full-screen Open handoff. -->
  <!-- @ds guardrail: do-not-edit — The exact-copy clipboard boundary; Open is a pass-through with no fetch/endpoint/ticket/download/host-file read. -->
  {#if feedback.canCopy}
    <button
      class="rich-block--action"
      use:hover
      aria-label={feedback.actionLabel('text')}
      onclick={() => feedback.copy('text', block.canonicalSource)}
    >{feedback.actionLabel('text')}</button>
  {/if}
  {#if canOpen}
    <button class="rich-block--action" use:hover bind:this={openButton} onclick={() => onOpen?.(openButton)}
      >Open full screen</button>
  {/if}
{/snippet}

<RichBlockFrame
  title={trustedLabel}
  eyebrow="Text artifact"
  metadata={[`${lines.length} lines`, `${block.canonicalSource.length} characters`]}
  redaction={block.redaction}
  class="rich-text-artifact-card"
  {...(block.label === 'long-text' ? { status: 'Long text' } : {})}
  {...(feedback.canCopy || canOpen ? { actions: actionsSnippet } : {})}
>
  <!-- @ds slot: preview — clipped text-artifact preview column. -->
  <div class="rich--text-artifact-preview">
    <pre>{preview}</pre>
  </div>
  {#if lines.length > PREVIEW_LINES}
    <p class="rich--continuation">{lines.length - PREVIEW_LINES} more lines</p>
  {/if}
  <!-- @ds guardrail: do-not-edit — Polite live region announcing Copy outcomes. -->
  <p class="rich--copy-status" role="status" aria-live="polite">{feedback.announcement}</p>
</RichBlockFrame>

<style>
  /* @ds surface: text-artifact-card — substantial text artifact preview with a
     full-screen Open handoff. */
  /* @ds slot: preview — clipped text-artifact preview column. */
  .rich--text-artifact-preview {
    max-block-size: 9.5rem;
    overflow: hidden;
    border-block: 1px solid var(--line);
  }

  /* @ds slot: preview — text-artifact lines (display serif, wrap-safe). */
  .rich--text-artifact-preview pre {
    margin: 0;
    padding-block: var(--space-3);
    color: var(--ink);
    font: 1rem/1.55 var(--font-display);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* @ds slot: labels — text continuation caption (muted small type). */
  .rich--continuation {
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* @ds state: copy — success · failure · unavailable. The Copy announcer line is a
     polite live region whose text carries the outcome; the presence styles are this. */
  /* @ds guardrail: do-not-edit — role="status" aria-live="polite" live region. */
  .rich--copy-status {
    min-block-size: 1.25rem;
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
  }
</style>
