<script module lang="ts">
  // This module holds the shared Tool Fold types.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TOOL FOLD
  // ───────────────────────────────────────────────────────────────────

  import type { Snippet } from 'svelte';

  export interface ToolFoldProps {
    readonly blockId?: string;
    readonly summary: string;
    readonly inFlight?: boolean;
    readonly children: Snippet;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { hover } from '$shared/primitives/a11y/interactions.js';
  import { createTranscriptDisclosureBinding } from '$shared/state/transcript-disclosure.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blockId, summary, inFlight = false, children }: ToolFoldProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const disclosure = createTranscriptDisclosureBinding(() => blockId);
</script>

<!-- section: one-line tool fold -->
<details class="tool-fold" class:is-in-flight={inFlight} bind:open={disclosure.open}>
  <summary class="tool-fold--summary" use:hover>
    <span class="tool-fold--marker" aria-hidden="true">▸</span>
    <span class="tool-fold--name">{summary}</span>
    {#if inFlight}
      <span class="tool-fold--status">In flight</span>
    {/if}
  </summary>
  <div class="tool-fold--body">
    {@render children()}
  </div>
</details>

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. FOLD
  ─────────────────────────────────────────────────────────────────── */
  /* Native disclosure so a single call+result collapses to one line. */
  .tool-fold {
    min-inline-size: 0;
  }

  /* This slot: summary — the one-line preview; in-flight is named, not empty. */
  .tool-fold--summary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 2.25rem;
    min-inline-size: 44px;
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-weight: 600;
    list-style: none;
  }

  .tool-fold--summary::-webkit-details-marker {
    display: none;
  }

  .tool-fold--summary:global([data-hovered]) .tool-fold--name {
    color: var(--ink-secondary);
  }

  .tool-fold--marker {
    display: inline-block;
    font-size: 1rem;
    line-height: 1;
    transition: transform var(--duration-state) var(--ease-out);
  }

  .tool-fold[open] .tool-fold--marker {
    transform: rotate(90deg);
  }

  .tool-fold--status {
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 550;
  }

  .tool-fold--body {
    min-inline-size: 0;
    padding: 0 var(--space-3) var(--space-3);
  }
</style>
