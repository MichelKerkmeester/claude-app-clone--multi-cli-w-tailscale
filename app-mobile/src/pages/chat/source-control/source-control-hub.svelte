<script module lang="ts">
  // This module holds the three-segment source-control composition contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SOURCE CONTROL HUB
  // ───────────────────────────────────────────────────────────────────

  import type {
    SourceControlHubData,
    SourceControlSegment,
  } from './source-control-types.js';

  export interface SourceControlHubProps {
    readonly data?: SourceControlHubData | null;
    readonly requestedSegment?: SourceControlSegment;
    readonly onSegmentChange?: (segment: SourceControlSegment) => void;
    readonly onExpandCommitFiles?: (commitId: string) => void;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import ChangedFiles from './changed-files.svelte';
  import CheckList from './check-list.svelte';
  import CheckSummary from './check-summary.svelte';
  import CommitHistory from './commit-history.svelte';
  import ConflictList from './conflict-list.svelte';
  import PrChip from './pr-chip.svelte';
  import ReviewerList from './reviewer-list.svelte';
  import UpstreamStatus from './upstream-status.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    data = null,
    requestedSegment = 'changes',
    onSegmentChange,
    onExpandCommitFiles,
    capability = true,
  }: SourceControlHubProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let selectedSegment = $state<SourceControlSegment | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const availableSegments = $derived<SourceControlSegment[]>(
    data === null || !capability
      ? []
      : [
          data.changes !== undefined && data.changes !== null ? 'changes' : null,
          data.pullRequest !== undefined && data.pullRequest !== null ? 'pr' : null,
          data.commits !== undefined && data.commits !== null ? 'commits' : null,
        ].filter((segment): segment is SourceControlSegment => segment !== null),
  );
  const activeSegment = $derived(
    selectedSegment !== null && availableSegments.includes(selectedSegment)
      ? selectedSegment
      : availableSegments.includes(requestedSegment)
        ? requestedSegment
        : (availableSegments[0] ?? null),
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // The first available host-backed segment is the safe fallback for an unavailable request.
  function chooseSegment(segment: SourceControlSegment): void {
    if (!availableSegments.includes(segment)) return;
    selectedSegment = segment;
    onSegmentChange?.(segment);
  }

  function segmentLabel(segment: SourceControlSegment): string {
    return segment === 'pr' ? 'PR' : segment.charAt(0).toLocaleUpperCase() + segment.slice(1);
  }
</script>

<!-- Component content -->
{#if capability && data !== null && availableSegments.length > 0 && activeSegment !== null}
  <section class="source-control-hub" aria-label="Source control" data-source-control-surface="hub">
    <div class="source-control-hub--segments" role="tablist" aria-label="Source control views">
      {#each availableSegments as segment (segment)}
        <button
          type="button"
          role="tab"
          class:is-active={activeSegment === segment}
          aria-selected={activeSegment === segment}
          aria-controls={`source-control-panel-${segment}`}
          class="source-control-hub--segment"
          onclick={() => chooseSegment(segment)}
        >
          {segmentLabel(segment)}
        </button>
      {/each}
    </div>

    {#if activeSegment === 'changes' && data.changes !== undefined && data.changes !== null}
      <div id="source-control-panel-changes" role="tabpanel" class="source-control-hub--panel">
        <ChangedFiles data={data.changes} />
        {#if data.conflicts !== undefined && data.conflicts !== null}
          <ConflictList conflicts={data.conflicts} />
        {/if}
        {#if data.upstreamStatus !== undefined && data.upstreamStatus !== null}
          <UpstreamStatus upstreamStatus={data.upstreamStatus} />
        {/if}
      </div>
    {:else if activeSegment === 'pr' && data.pullRequest !== undefined && data.pullRequest !== null}
      <div id="source-control-panel-pr" role="tabpanel" class="source-control-hub--panel">
        <PrChip summary={data.pullRequest} details={data.pullRequest} />
        {#if data.checkSummary !== undefined && data.checkSummary !== null}
          <CheckSummary summary={data.checkSummary} />
        {/if}
        {#if data.checks !== undefined && data.checks !== null}
          <CheckList checks={data.checks} />
        {/if}
        {#if data.reviewers !== undefined && data.reviewers !== null}
          <ReviewerList reviewers={data.reviewers} />
        {/if}
        {#if data.conflicts !== undefined && data.conflicts !== null}
          <ConflictList conflicts={data.conflicts} />
        {/if}
      </div>
    {:else if activeSegment === 'commits' && data.commits !== undefined && data.commits !== null}
      <div id="source-control-panel-commits" role="tabpanel" class="source-control-hub--panel">
        {#if onExpandCommitFiles !== undefined}
          <CommitHistory data={data.commits} onExpandFiles={onExpandCommitFiles} />
        {:else}
          <CommitHistory data={data.commits} />
        {/if}
        {#if data.upstreamStatus !== undefined && data.upstreamStatus !== null}
          <UpstreamStatus upstreamStatus={data.upstreamStatus} />
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  /* This surface: hub — composes the source-control views without owning host truth. */
  .source-control-hub {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
    color: var(--ink);
  }

  /* This slot: segments — exposes only segments backed by host data. */
  .source-control-hub--segments {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
    padding: var(--space-1);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    background: var(--surface-raised);
  }

  /* This slot: segment — gives each available view a 44px target. */
  .source-control-hub--segment {
    min-block-size: 44px;
    padding-inline: var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink-secondary);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  /* This state: active — identifies the selected view with text and surface contrast. */
  .source-control-hub--segment.is-active {
    background: var(--canvas-subtle);
    color: var(--ink);
  }

  /* This state: focus-visible — keeps keyboard focus visible on a segment. */
  .source-control-hub--segment:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: panel — stacks the selected source-control surfaces. */
  .source-control-hub--panel {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
  }

  @media (max-width: 24rem) {
    /* Keep segment labels readable in a narrow viewport. */
    .source-control-hub--segments {
      gap: 0;
    }

    /* Keep each narrow-view segment above the touch-target floor. */
    .source-control-hub--segment {
      padding-inline: var(--space-1);
      font-size: 0.82rem;
    }
  }
</style>
