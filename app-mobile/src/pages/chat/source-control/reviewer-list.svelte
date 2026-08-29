<script module lang="ts">
  // This module holds host-provided reviewer rows.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: REVIEWER LIST
  // ───────────────────────────────────────────────────────────────────

  import type { ReviewerRow } from './source-control-types.js';

  export interface ReviewerListProps {
    readonly reviewers?: readonly ReviewerRow[] | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { reviewers = null, capability = true }: ReviewerListProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const REVIEWER_STATUS_LABELS = {
    approved: 'Approved',
    'changes-requested': 'Changes requested',
    commented: 'Commented',
    pending: 'Pending',
  } as const;
</script>

<!-- Component content -->
{#if capability && reviewers !== null && reviewers.length > 0}
  <section class="source-control-reviewer-list" aria-label="Reviewers" data-source-control-surface="reviewers">
    <h3>Reviewers</h3>
    <ul>
      {#each reviewers as reviewer (reviewer.id)}
        <li class={`source-control-reviewer-list--row is-${reviewer.status}`}>
          <span class="source-control-reviewer-list--name" dir="auto">{reviewer.name}</span>
          <span class="source-control-reviewer-list--status">{reviewer.label ?? REVIEWER_STATUS_LABELS[reviewer.status]}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  /* This surface: reviewers — renders host reviewer rows with text and state together. */
  .source-control-reviewer-list {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: heading — identifies the reviewer rows. */
  .source-control-reviewer-list h3 {
    margin: 0 0 var(--space-2);
    font-size: 0.95rem;
  }

  /* This slot: rows — provides stable reviewer row semantics. */
  .source-control-reviewer-list ul {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* This slot: row — pairs reviewer identity and host status. */
  .source-control-reviewer-list--row {
    display: flex;
    min-block-size: 44px;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-block-start: 1px solid var(--line);
  }

  /* This slot: name — preserves the host reviewer identity. */
  .source-control-reviewer-list--name {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  /* This slot: status — keeps the textual status beside its colour cue. */
  .source-control-reviewer-list--status {
    flex: 0 0 auto;
    color: var(--ink-secondary);
    font-size: 0.8rem;
    text-align: end;
  }

  /* This state: approved — supplies a restrained positive state cue. */
  .source-control-reviewer-list--row.is-approved .source-control-reviewer-list--status {
    color: var(--success);
  }

  /* This state: changes-requested — supplies a restrained warning cue. */
  .source-control-reviewer-list--row.is-changes-requested .source-control-reviewer-list--status {
    color: var(--danger);
  }

  /* This state: commented — supplies a restrained informational cue. */
  .source-control-reviewer-list--row.is-commented .source-control-reviewer-list--status {
    color: var(--accent-ink);
  }

  /* This state: pending — supplies a restrained pending cue. */
  .source-control-reviewer-list--row.is-pending .source-control-reviewer-list--status {
    color: var(--ink-muted);
  }
</style>
