<script module lang="ts">
  // This module holds the separate conflict-source contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CONFLICT LIST
  // ───────────────────────────────────────────────────────────────────

  import type { ConflictSets } from './source-control-types.js';

  export interface ConflictListProps {
    readonly conflicts?: ConflictSets | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { conflicts = null, capability = true }: ConflictListProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 2. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const hasProviderConflicts = $derived((conflicts?.providerReported?.length ?? 0) > 0);
  const hasLocalConflicts = $derived((conflicts?.locallyConfirmed?.length ?? 0) > 0);
</script>

<!-- Component content -->
{#if capability && conflicts !== null && (hasProviderConflicts || hasLocalConflicts)}
  <section class="source-control-conflict-list" aria-label="Conflicting files" data-source-control-surface="conflicts">
    <h3>Conflicting files</h3>
    {#if hasProviderConflicts}
      <section class="source-control-conflict-list--group" aria-label="Provider-reported conflicts">
        <h4>Provider-reported</h4>
        <ul>
          {#each conflicts.providerReported ?? [] as file (file.path)}
            <li dir="ltr">{file.path}</li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if hasLocalConflicts}
      <section class="source-control-conflict-list--group" aria-label="Locally confirmed conflicts">
        <h4>Locally confirmed</h4>
        <ul>
          {#each conflicts.locallyConfirmed ?? [] as file (file.path)}
            <li dir="ltr">{file.path}</li>
          {/each}
        </ul>
      </section>
    {/if}
  </section>
{/if}

<style>
  /* This surface: conflicts — keeps provider claims separate from local confirmation. */
  .source-control-conflict-list {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: heading — identifies the conflict report. */
  .source-control-conflict-list h3 {
    margin: 0 0 var(--space-2);
    font-size: 0.95rem;
  }

  /* This slot: group — retains provenance for one conflict source. */
  .source-control-conflict-list--group + .source-control-conflict-list--group {
    margin-block-start: var(--space-3);
    padding-block-start: var(--space-3);
    border-block-start: 1px solid var(--line);
  }

  /* This slot: group-heading — names the source without collapsing its meaning. */
  .source-control-conflict-list--group h4 {
    margin: 0;
    color: var(--ink-secondary);
    font-size: 0.8rem;
  }

  /* This slot: rows — keeps each host file path distinct. */
  .source-control-conflict-list--group ul {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-2) 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
</style>
