<script module lang="ts">
  // This module holds the read-only pull-request details contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: PULL REQUEST DETAILS SHEET
  // ───────────────────────────────────────────────────────────────────

  import type { PullRequestDetails } from './source-control-types.js';

  export interface SheetPrDetailsProps {
    readonly details?: PullRequestDetails | null;
    readonly open?: boolean;
    readonly onClose?: () => void;
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

  let {
    details = null,
    open = false,
    onClose,
    capability = true,
  }: SheetPrDetailsProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep optional provenance fields absent instead of manufacturing placeholders.
  function hasText(value: string | number | undefined): value is string | number {
    return value !== undefined && String(value).length > 0;
  }

  // Reject unsafe host URLs while preserving the exact safe URL supplied by the host.
  function openOnWeb(event: MouseEvent, href: string): void {
    if (classifyHrefScheme(href) !== 'open-external') event.preventDefault();
  }
</script>

<!-- Component content -->
{#if capability && open && details !== null}
  <div class="source-control-sheet-backdrop" data-source-control-surface="pr-details">
    <div
      class="source-control-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-control-pr-details-title"
      tabindex="-1"
    >
      <header class="source-control-sheet--header">
        <div>
          <p class="source-control-sheet--eyebrow">Pull request</p>
          <h2 id="source-control-pr-details-title">{details.title ?? 'Pull request details'}</h2>
        </div>
        <button
          type="button"
          class="source-control-sheet--close"
          aria-label="Close pull request details"
          use:hover
          use:press
          use:focusVisible
          onclick={() => {
            onClose?.();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <dl class="source-control-sheet--summary">
        <div>
          <dt>State</dt>
          <dd>{details.stateLabel ?? details.state}</dd>
        </div>
        <div>
          <dt>Worst-of</dt>
          <dd>{details.rollupLabel ?? details.rollup}</dd>
        </div>
        {#if details.commentCount !== undefined}
          <div>
            <dt>Comments</dt>
            <dd>{details.commentCount}</dd>
          </div>
        {/if}
        {#if hasText(details.number)}
          <div>
            <dt>Number</dt>
            <dd dir="ltr">{details.number}</dd>
          </div>
        {/if}
      </dl>

      {#if details.description !== undefined && details.description.length > 0}
        <p class="source-control-sheet--description" dir="auto">{details.description}</p>
      {/if}
      {#if details.webUrl !== undefined && details.webUrl !== null && details.webUrl.length > 0}
        <a
          class="source-control-sheet--link"
          href={details.webUrl}
          target="_blank"
          rel="external noopener noreferrer"
          onclick={(event) => openOnWeb(event, details.webUrl ?? '')}
        >
          Open pull request on the provider
        </a>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* This surface: sheet-backdrop — isolates the read-only details surface from the chat. */
  .source-control-sheet-backdrop {
    position: fixed;
    z-index: 20;
    inset: 0;
    display: grid;
    place-items: end center;
    padding: var(--space-4);
    background: rgb(0 0 0 / 35%);
  }

  /* This surface: sheet — contains host-provided pull-request facts without mutation controls. */
  .source-control-sheet {
    inline-size: min(100%, 32rem);
    max-block-size: min(80vh, 42rem);
    overflow: auto;
    padding: var(--space-6);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--canvas);
    color: var(--ink);
    box-shadow: var(--shadow-raised);
  }

  /* This slot: header — keeps the title and close control reachable. */
  .source-control-sheet--header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* This slot: eyebrow — identifies the provider-neutral details surface. */
  .source-control-sheet--eyebrow {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.76rem;
    text-transform: uppercase;
  }

  /* This slot: title — names the read-only details. */
  .source-control-sheet h2 {
    margin: var(--space-1) 0 0;
    font-family: var(--font-display);
    font-size: 1.2rem;
  }

  /* This slot: close — provides a named 44px dismissal control. */
  .source-control-sheet--close {
    display: grid;
    min-inline-size: 44px;
    min-block-size: 44px;
    place-items: center;
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ink);
    font-size: 1.5rem;
    cursor: pointer;
  }

  /* This state: hover · pressed — provides non-color-only feedback for dismissal. */
  :global(.source-control-sheet--close[data-hovered]),
  :global(.source-control-sheet--close[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps keyboard focus visible on dismissal. */
  :global(.source-control-sheet--close[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: summary — lays out the host-provided facts. */
  .source-control-sheet--summary {
    display: grid;
    gap: var(--space-2);
    margin: var(--space-5) 0 0;
  }

  /* This slot: summary-row — pairs each fact label with its value. */
  .source-control-sheet--summary > div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-block-end: 1px solid var(--line);
  }

  /* This slot: summary-label — keeps metadata visually quiet. */
  .source-control-sheet--summary dt {
    color: var(--ink-muted);
  }

  /* This slot: summary-value — preserves host text and direction. */
  .source-control-sheet--summary dd {
    margin: 0;
    color: var(--ink);
    font-weight: 700;
    text-align: end;
  }

  /* This slot: description — presents the optional provider description. */
  .source-control-sheet--description {
    margin: var(--space-4) 0 0;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  /* This slot: link — exposes only the URL supplied by the host. */
  .source-control-sheet--link {
    display: inline-flex;
    min-block-size: 44px;
    align-items: center;
    margin-block-start: var(--space-4);
    color: var(--accent);
    font-weight: 700;
  }
</style>
