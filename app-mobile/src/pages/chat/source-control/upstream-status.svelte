<script module lang="ts">
  // This module holds the host-authoritative upstream status contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: UPSTREAM STATUS
  // ───────────────────────────────────────────────────────────────────

  import type { UpstreamStatus } from './source-control-types.js';

  export interface UpstreamStatusProps {
    readonly upstreamStatus?: UpstreamStatus | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { upstreamStatus = null, capability = true }: UpstreamStatusProps = $props();

  // An empty object is not an upstream snapshot and must stay inert.
  const hasStatusFields = $derived(
    upstreamStatus !== null &&
      (upstreamStatus.branch !== undefined ||
        upstreamStatus.upstream !== undefined ||
        upstreamStatus.ahead !== undefined ||
        upstreamStatus.behind !== undefined),
  );
</script>

<!-- Component content -->
{#if capability && upstreamStatus !== null && hasStatusFields}
  <section class="source-control-upstream-status" aria-label="Branch sync" data-source-control-surface="upstream-status">
    <h3>Branch sync</h3>
    <dl>
      {#if upstreamStatus.branch !== undefined}
        <div>
          <dt>Branch</dt>
          <dd dir="ltr">{upstreamStatus.branch}</dd>
        </div>
      {/if}
      {#if upstreamStatus.upstream !== undefined}
        <div>
          <dt>Upstream</dt>
          <dd dir="ltr">{upstreamStatus.upstream}</dd>
        </div>
      {/if}
      {#if upstreamStatus.ahead !== undefined}
        <div>
          <dt>Ahead</dt>
          <dd>{upstreamStatus.ahead}</dd>
        </div>
      {/if}
      {#if upstreamStatus.behind !== undefined}
        <div>
          <dt>Behind</dt>
          <dd>{upstreamStatus.behind}</dd>
        </div>
      {/if}
    </dl>
  </section>
{/if}

<style>
  /* This surface: upstream-status — renders only the host's upstream snapshot. */
  .source-control-upstream-status {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: heading — identifies the host sync snapshot. */
  .source-control-upstream-status h3 {
    margin: 0 0 var(--space-2);
    font-size: 0.95rem;
  }

  /* This slot: facts — keeps branch identity and counts readable together. */
  .source-control-upstream-status dl {
    display: grid;
    gap: var(--space-1);
    margin: 0;
  }

  /* This slot: fact-row — aligns each host-provided field. */
  .source-control-upstream-status dl > div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-1);
    border-block-start: 1px solid var(--line);
  }

  /* This slot: fact-label — keeps metadata quiet. */
  .source-control-upstream-status dt {
    color: var(--ink-muted);
  }

  /* This slot: fact-value — preserves branch direction and numeric readability. */
  .source-control-upstream-status dd {
    margin: 0;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    text-align: end;
  }
</style>
