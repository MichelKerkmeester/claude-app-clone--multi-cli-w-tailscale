<script module lang="ts">
  // This module holds the per-check row contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CHECK LIST
  // ───────────────────────────────────────────────────────────────────

  import type { CheckRow } from './source-control-types.js';

  export interface CheckListProps {
    readonly checks?: readonly CheckRow[] | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';
  import { classifyHrefScheme } from '../rich-content/prose-link.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { checks = null, capability = true }: CheckListProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let expandedById = $state<Record<string, boolean>>({});

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // The host supplies order so the client never derives a worst state from row data.
  const orderedChecks = $derived(
    (checks ?? [])
      .map((check, index) => ({ check, index }))
      .sort((left, right) => (left.check.order ?? left.index) - (right.check.order ?? right.index))
      .map(({ check }) => check),
  );
  const firstFailureId = $derived(
    orderedChecks.find((check) => isFailureToken(check.classification))?.id ?? null,
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Match only a host classification token that explicitly names failure.
  function isFailureToken(value: string): boolean {
    const normalized = value.toLocaleLowerCase();
    return normalized === 'failing' || normalized === 'failure' || normalized === 'failed';
  }

  // Unknown is an unresolved host classification, never a passing result.
  function statusText(check: CheckRow): string {
    return check.classification.toLocaleLowerCase() === 'unknown' ? 'MUTED UNRESOLVED' : check.statusLabel;
  }

  // Keep local expansion choices separate from the host-provided ordering.
  function toggle(check: CheckRow): void {
    const nextOpen = expandedById[check.id] !== true;
    expandedById = { [check.id]: nextOpen };
  }

  // The first failure is expanded until the person makes a local choice.
  function isExpanded(check: CheckRow): boolean {
    return expandedById[check.id] ?? check.id === firstFailureId;
  }

  // Reject unsafe host URLs while preserving the exact safe URL supplied by the host.
  function openOnWeb(event: MouseEvent, href: string): void {
    if (classifyHrefScheme(href) !== 'open-external') event.preventDefault();
  }
</script>

<!-- Component content -->
{#if capability && checks !== null && checks.length > 0}
  <section class="source-control-check-list" aria-label="Checks" data-source-control-surface="check-list">
    <h3>Checks</h3>
    <ul>
      {#each orderedChecks as check (check.id)}
        {@const expanded = isExpanded(check)}
        <li class="source-control-check-list--row" data-check-id={check.id} data-check-state={check.classification}>
          <button
            type="button"
            class="source-control-check-list--toggle"
            aria-expanded={expanded}
            aria-controls={`source-control-check-${check.id}`}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} check ${check.name}`}
            use:hover
            use:press
            use:focusVisible
            onclick={() => toggle(check)}
          >
            <span class="source-control-check-list--name">{check.name}</span>
            <span class="source-control-check-list--status">{statusText(check)}</span>
            <span class="source-control-check-list--chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
          </button>

          {#if expanded}
            <div id={`source-control-check-${check.id}`} class="source-control-check-list--details">
              {#if check.detail !== undefined && check.detail.length > 0}
                <p>{check.detail}</p>
              {/if}
              {#if check.webUrl !== undefined && check.webUrl !== null && check.webUrl.length > 0}
                <a
                  href={check.webUrl}
                  target="_blank"
                  rel="external noopener noreferrer"
                  onclick={(event) => openOnWeb(event, check.webUrl ?? '')}
                >Open on web</a>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  /* This surface: check-list — renders host-classified checks in host-resolved order. */
  .source-control-check-list {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: heading — identifies the list without choosing a result. */
  .source-control-check-list h3 {
    margin: 0 0 var(--space-2);
    font-size: 0.95rem;
  }

  /* This slot: rows — removes list decoration while retaining row semantics. */
  .source-control-check-list ul {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* This slot: row — groups one check's toggle and optional details. */
  .source-control-check-list--row {
    min-inline-size: 0;
    border-block-start: 1px solid var(--line);
  }

  /* This slot: toggle — gives each check a reachable 44px disclosure control. */
  .source-control-check-list--toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    min-inline-size: 100%;
    min-block-size: 44px;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  /* This slot: name — keeps a long check name readable. */
  .source-control-check-list--name {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  /* This slot: status — keeps the host status token visible beside its name. */
  .source-control-check-list--status {
    color: var(--ink-secondary);
    font-size: 0.8rem;
    text-align: end;
  }

  /* This slot: chevron — provides a non-color expansion cue. */
  .source-control-check-list--chevron {
    inline-size: 1.25rem;
    color: var(--ink-muted);
    text-align: center;
  }

  /* This state: hover · pressed — provides non-color-only interaction feedback. */
  :global(.source-control-check-list--toggle[data-hovered]),
  :global(.source-control-check-list--toggle[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps keyboard focus visible on a check row. */
  :global(.source-control-check-list--toggle[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: details — contains optional host detail and web action. */
  .source-control-check-list--details {
    display: grid;
    gap: var(--space-2);
    padding: 0 0 var(--space-3);
    color: var(--ink-secondary);
    font-size: 0.82rem;
  }

  /* This slot: detail-copy — resets the optional detail paragraph. */
  .source-control-check-list--details p {
    margin: 0;
  }

  /* This slot: web-link — exposes only a host-supplied URL. */
  .source-control-check-list--details a {
    display: inline-flex;
    min-block-size: 44px;
    align-items: center;
    color: var(--accent-ink);
    font-weight: 700;
  }
</style>
