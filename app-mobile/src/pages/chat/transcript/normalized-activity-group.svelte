<script module lang="ts">
  // This module holds the shared Normalized Activity Group types and helpers.
  import type { NormalizedActivityBlock } from '../rich-content/normalize-transcript-blocks.js';

  export interface NormalizedActivityGroupProps {
    readonly blocks: readonly NormalizedActivityBlock[];
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { createTranscriptDisclosureBinding } from '$shared/state/transcript-disclosure.svelte.js';
  import RichContentRouter from '../rich-content/rich-content-router.svelte';
  import ToolFold from './tool-fold.svelte';
  import { pairActivityRuns } from './tool-run-pairing.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blocks }: NormalizedActivityGroupProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const runs = $derived(pairActivityRuns(blocks));

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Toggle every run through the shared disclosure map so remounts keep the state.
  function toggleAll(): void {
    const anyOpen = runs.some((run) => createTranscriptDisclosureBinding(() => run.id).open);
    for (const run of runs) {
      createTranscriptDisclosureBinding(() => run.id).open = !anyOpen;
    }
  }
</script>

<!-- section: flat tool runs -->
<div class="activity--group">
  {#if runs.length > 1}
    <button
      type="button"
      class="activity--toggle"
      use:hover
      use:press
      use:focusVisible
      onclick={toggleAll}
    >
      Expand all
    </button>
  {/if}
  {#each runs as run (run.id)}
    <div class="tool-run">
      <ToolFold blockId={run.id} summary={run.summary} inFlight={run.inFlight}>
        <div class="activity--stack">
          {#each run.blocks as block (block.blockId)}
            <RichContentRouter {block} />
          {/each}
        </div>
      </ToolFold>
      <button
        type="button"
        class="tool-run--file"
        use:hover
        use:press
        use:focusVisible
        disabled
        aria-disabled="true"
      >
        Open file
        <span class="tool-run--hint">Unavailable without a host artifact</span>
      </button>
    </div>
  {/each}
</div>

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. ACTIVITY GROUP
  ─────────────────────────────────────────────────────────────────── */
  /* Flat one-line runs; grouping is a projection of host blocks only. */
  .activity--group {
    min-inline-size: 0;
  }

  .activity--toggle,
  .tool-run--file {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 44px;
    min-inline-size: 44px;
    padding: var(--space-1) var(--space-2);
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .activity--toggle:global([data-hovered]),
  .tool-run--file:global([data-hovered]) {
    color: var(--ink-secondary);
  }

  .activity--toggle:global([data-focus-visible]),
  .tool-run--file:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .tool-run--file:disabled {
    cursor: default;
  }

  .tool-run--hint {
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 550;
  }

  .activity--stack {
    display: grid;
    gap: var(--space-2);
  }
</style>
