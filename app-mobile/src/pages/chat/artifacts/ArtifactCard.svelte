<script module lang="ts">
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  export interface ArtifactCardProps {
    readonly block: FileDiffBlock;
  }

  const PEEK_LINE_COUNT = 6;
</script>

<script lang="ts">
  import { getOptionalArtifactViewer } from './ArtifactViewerProvider.svelte';
  import { hover, press, focusVisible } from '../../../shared/primitives/interactions.js';

  let { block }: ArtifactCardProps = $props();

  // @ds surface: artifact-card — the in-transcript read-only card that opens the diff viewer.
  // @ds slot: glyph | body (meta · summary · peek) | open — the card chrome regions.
  // @ds guardrail: do-not-edit — the button + click opening the viewer are frozen.
  let buttonRef = $state<HTMLButtonElement | null>(null);
  const viewer = getOptionalArtifactViewer();
  const patchLines = $derived(block.patch.split('\n'));
  const peekLines = $derived(
    Array.from({ length: PEEK_LINE_COUNT }, (_, index) => patchLines[index] ?? ''),
  );
</script>

<button
  bind:this={buttonRef}
  type="button"
  class="artifact-card"
  aria-label={`Open file diff: ${block.summary}`}
  use:hover
  use:press
  use:focusVisible
  onclick={() => viewer?.openDiff(block, buttonRef)}
>
  <span class="artifact-card-glyph" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M5 7h14M5 12h14M5 17h8" />
      <path d="M16 15v6M13 18h6" />
    </svg>
  </span>
  <span class="artifact-card-body">
    <span class="artifact-card-meta">
      <span>File diff</span>
      <span>Read-only</span>
    </span>
    <span class="artifact-card-summary">{block.summary}</span>
    <!-- @ds slot: peek — the clipped 6-line diff preview (mayReorder content only). -->
    <span class="artifact-card-peek" aria-label="Diff preview">{#each peekLines as line, index}<span class="artifact-card-peek-line">{line || ' '}{index < peekLines.length - 1 ? '\n' : ''}</span>{/each}</span>
  </span>
  <span class="artifact-card-open" aria-hidden="true">Open</span>
</button>

<!-- @ds surface: artifact-card — the read-only in-transcript diff card. Decomposed into this scoped block;
     the react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states are preserved by the
     use:hover/use:press/use:focusVisible actions and scoped as :global([data-*]). The glyph icon
     geometry is shared with the viewer close icon, whose copy stays in app.css. Values unchanged. -->
<style>
  /* @ds slot: card — the read-only artifact card button; glyph · body · open grid. */
  .artifact-card {
    display: grid;
    min-inline-size: 0;
    min-block-size: 10rem;
    grid-template-columns: 2.75rem minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: start;
    inline-size: 100%;
    padding: var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    color: var(--ink);
    text-align: start;
    cursor: pointer;
  }

  /* @ds state: hover — react-aria data-hovered accent tint (via use:hover). */
  .artifact-card:global([data-hovered]) {
    border-color: var(--accent-strong);
    background: var(--accent-soft);
  }

  /* @ds state: pressed — react-aria data-pressed; no press-scale. */
  .artifact-card:global([data-pressed]) {
    transform: none;
  }

  /* @ds state: focus-visible — canonical card focus ring (never colour-only). */
  .artifact-card:global([data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  /* @ds slot: glyph — the artifact-type glyph chip. */
  .artifact-card-glyph {
    display: grid;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    place-items: center;
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* @ds slot: glyph-icon — 1.35rem stroke geometry (the viewer close icon reuses this in app.css). */
  .artifact-card-glyph svg {
    inline-size: 1.35rem;
    block-size: 1.35rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  /* @ds slot: body — meta · summary · peek column. */
  .artifact-card-body {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-2);
  }

  /* @ds slot: meta — uppercase fact chips. */
  .artifact-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* @ds slot: meta-sep — the '/' separator between fact chips. */
  .artifact-card-meta span + span::before {
    margin-inline-end: var(--space-2);
    content: '/';
    color: var(--line-strong);
  }

  /* @ds slot: summary — the artifact's display-name read-out. */
  .artifact-card-summary {
    overflow-wrap: anywhere;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.35;
  }

  /* @ds slot: peek — the clipped 6-line diff preview (mayReorder content only). */
  /* @ds guardrail: do-not-edit — peek is clipped and bidi-stable; never expand in the card. */
  .artifact-card-peek {
    display: block;
    min-inline-size: 0;
    max-block-size: calc(1.45em * 6);
    overflow: hidden;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-code);
    color: var(--ink-inverse);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.45;
    text-align: start;
    white-space: pre;
  }

  /* @ds slot: peek-line — one clipped, ellipsized peek row. */
  .artifact-card-peek-line {
    display: block;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* @ds slot: open — the trailing "Open" handoff affordance. */
  .artifact-card-open {
    min-block-size: 2.75rem;
    padding-block: 0.7rem;
    color: var(--accent-ink);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  /* @ds edit: layout — narrow reflow at <=24rem: drop the trailing Open, tighten glyph + grid. */
  @media (max-width: 24rem) {
    .artifact-card {
      grid-template-columns: 2.25rem minmax(0, 1fr);
      padding: var(--space-3);
    }

    .artifact-card-glyph {
      inline-size: 2.25rem;
      block-size: 2.25rem;
    }

    .artifact-card-open {
      display: none;
    }
  }

  /* @ds guardrail: do-not-edit — reduced-motion must never re-enable transform motion. */
  @media (prefers-reduced-motion: reduce) {
    .artifact-card {
      animation: none;
      transition: none;
    }
  }
</style>
