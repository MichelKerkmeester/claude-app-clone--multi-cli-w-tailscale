<script module lang="ts">
  // This module holds the provider-neutral check summary contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CHECK SUMMARY
  // ───────────────────────────────────────────────────────────────────

  import type { CheckSummary } from './source-control-types.js';

  export interface CheckSummaryProps {
    readonly summary?: CheckSummary | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { summary = null, capability = true }: CheckSummaryProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Unknown is an unresolved host classification, never a passing result.
  function isUnknown(value: string): boolean {
    return value.toLocaleLowerCase() === 'unknown';
  }
</script>

<!-- Component content -->
{#if capability && summary !== null}
  {@const unresolved = isUnknown(summary.classification)}
  <section
    class={`source-control-check-summary${unresolved ? ' is-muted-unresolved' : ''}`}
    aria-label="Check summary"
    data-check-classification={summary.classification}
    data-source-control-surface="check-summary"
  >
    <span class="source-control-check-summary--label">Checks</span>
    <strong class="source-control-check-summary--value">
      {unresolved ? 'MUTED UNRESOLVED' : summary.label}
    </strong>
    {#if summary.detail !== undefined && summary.detail.length > 0}
      <span class="source-control-check-summary--detail">{summary.detail}</span>
    {/if}
  </section>
{/if}

<style>
  /* This surface: check-summary — presents the host's classified aggregate. */
  .source-control-check-summary {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This state: unresolved — keeps an unknown host classification visibly muted. */
  .source-control-check-summary.is-muted-unresolved {
    border-color: var(--line);
    background: var(--canvas-subtle);
    color: var(--ink-muted);
  }

  /* This state: passing — a successful host aggregate, on the section border. */
  .source-control-check-summary[data-check-classification='passing'] {
    border-color: var(--success);
  }

  /* This slot: value — success ink for a passing classification. */
  .source-control-check-summary[data-check-classification='passing'] .source-control-check-summary--value {
    color: var(--success);
  }

  /* This state: failing — a failing host aggregate, on the section border. */
  .source-control-check-summary[data-check-classification='failing'] {
    border-color: var(--danger);
  }

  /* This slot: value — danger ink for a failing classification. */
  .source-control-check-summary[data-check-classification='failing'] .source-control-check-summary--value {
    color: var(--danger);
  }

  /* This state: pending — an in-flight host aggregate, on the section border. */
  .source-control-check-summary[data-check-classification='pending'] {
    border-color: var(--warning);
  }

  /* This slot: value — warning ink for a pending classification. */
  .source-control-check-summary[data-check-classification='pending'] .source-control-check-summary--value {
    color: var(--warning);
  }

  /* This slot: label — identifies the aggregate without implying a verdict. */
  .source-control-check-summary--label {
    color: var(--ink-muted);
    font-size: 0.76rem;
    text-transform: uppercase;
  }

  /* This slot: value — shows the host classification or the fixed unresolved label. */
  .source-control-check-summary--value {
    font-size: 0.95rem;
  }

  /* This slot: detail — displays optional host status context. */
  .source-control-check-summary--detail {
    color: var(--ink-secondary);
    font-size: 0.8rem;
  }
</style>
