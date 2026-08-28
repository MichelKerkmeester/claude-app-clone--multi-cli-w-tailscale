<script module lang="ts">
  // This module holds the read-only pull-request chip contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: PULL REQUEST CHIP
  // ───────────────────────────────────────────────────────────────────

  import type { PullRequestDetails, PullRequestSummary } from './source-control-types.js';

  export interface PrChipProps {
    readonly summary?: PullRequestSummary | null;
    readonly details?: PullRequestDetails | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';
  import SheetPrDetails from './sheet-pr-details.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { summary = null, details = null, capability = true }: PrChipProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let detailsOpen = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep the host-provided label visible without translating its state token.
  function stateText(value: PullRequestSummary): string {
    return value.stateLabel ?? value.state;
  }

  // Keep the host-provided rollup visible without deriving it from checks.
  function rollupText(value: PullRequestSummary): string {
    return value.rollupLabel ?? value.rollup;
  }

  // Use only host-provided summary fields when the optional detail record is absent.
  function detailRecord(value: PullRequestSummary, provided: PullRequestDetails | null): PullRequestDetails {
    return provided ?? value;
  }
</script>

<!-- Component content -->
{#if capability && summary !== null}
  <button
    type="button"
    class="source-control-pr-chip"
    aria-label={`Open pull request details: ${stateText(summary)}, ${rollupText(summary)}`}
    data-source-control-surface="pr-chip"
    use:hover
    use:press
    use:focusVisible
    onclick={() => {
      detailsOpen = true;
    }}
  >
    <span class="source-control-pr-chip--state">{stateText(summary)}</span>
    <span class="source-control-pr-chip--rollup">{rollupText(summary)}</span>
    {#if summary.commentCount !== undefined}
      <span class="source-control-pr-chip--comments" aria-label={`${summary.commentCount} comments`}>
        {summary.commentCount}
      </span>
    {/if}
  </button>

  {#if detailsOpen}
    <SheetPrDetails
      open={detailsOpen}
      details={detailRecord(summary, details)}
      onClose={() => {
        detailsOpen = false;
      }}
    />
  {/if}
{/if}

<style>
  /* This surface: pr-chip — the compact read-only pull-request status affordance. */
  .source-control-pr-chip {
    display: inline-flex;
    min-block-size: 44px;
    align-items: center;
    gap: var(--space-2);
    max-inline-size: 100%;
    padding-inline: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    background: var(--surface-raised);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }

  /* This slot: state — the host's pull-request state token. */
  .source-control-pr-chip--state {
    font-weight: 700;
  }

  /* This slot: rollup — the host's worst-of rollup token. */
  .source-control-pr-chip--rollup {
    color: var(--ink-secondary);
  }

  /* This slot: comments — the host's comment count. */
  .source-control-pr-chip--comments {
    min-inline-size: 1.5rem;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  /* This state: hover · pressed — gives pointer and press feedback without relying on color alone. */
  :global(.source-control-pr-chip[data-hovered]),
  :global(.source-control-pr-chip[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps keyboard focus visible on the chip. */
  :global(.source-control-pr-chip[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
</style>
