<script module lang="ts">
  // This module holds the shared Card File Preview types and helpers.
  import type { FileDiffBlock, FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  export interface FilePreviewCardProps {
    readonly block: FilePreviewBlock;
    readonly sessionId: string;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { getOptionalArtifactViewer } from '../artifacts/artifact-viewer-provider.svelte';
  import { filePreviewAvailability } from '$shared/state/state.js';
  import { formatArtifactSize } from '$shared/format/format.js';
  import Button from '$shared/primitives/button/button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, sessionId }: FilePreviewCardProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // This surface: file-preview-card — Read-only preview card; states come from data-preview-state (ready · withheld · missing · denied · unsupported).
  // Do not edit — react-aria Button press, aria-label, and viewer open (onPress) — Not designer-editable.
  let buttonEl = $state<HTMLButtonElement | null>(null);
  const viewer = getOptionalArtifactViewer();

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const availability = $derived(filePreviewAvailability(block));
  const stateLabel = $derived({
    ready: 'Ready',
    withheld: 'Withheld',
    missing: 'Missing',
    denied: 'Denied',
    unsupported: 'Unsupported',
  }[availability]);
  const metadata = $derived([
    `${stateLabel} preview`,
    `${block.renderer} · ${block.mimeType}`,
    `Revision ${block.revision}`,
    block.byteLength === null ? 'Size unavailable' : `${formatArtifactSize(block.byteLength)}`,
    block.redaction === 'withheld' ? 'Relay withheld content' : 'Relay metadata only',
  ].join('\n'));
</script>

<!-- Component content -->
<div class="file-preview-card" data-preview-state={availability}>
  <Button
    class="artifact-card"
    aria-label={`Open file preview: ${block.displayName}`}
    data-artifact-session-id={sessionId}
    onclick={() => viewer?.openDiff(block as unknown as FileDiffBlock, buttonEl)}
    {@attach (node) => {
      buttonEl = node as HTMLButtonElement;
      return () => {
        if (buttonEl === node) buttonEl = null;
      };
    }}
  >
    <span class="artifact-card--icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 7h14M5 12h14M5 17h8" />
        <path d="M16 15v6M13 18h6" />
      </svg>
    </span>
    <span class="artifact-card--body">
      <span class="artifact-card--meta">
        <span>File preview</span>
        <span>{stateLabel}</span>
      </span>
      <span class="artifact-card--summary">{block.displayName}</span>
      <span class="artifact-card-peek" aria-label="Preview metadata">
        {metadata}
      </span>
    </span>
    <span class="artifact-card--open" aria-hidden="true">
      Open
    </span>
  </Button>
</div>

<!-- File preview card -->
<!-- This surface: file-preview-card — the in-transcript read-only preview card. The Button
     primitive owns the .artifact-card class via a class prop, so the card chrome is reached
     with :global; Svelte scoping would otherwise drop those rules. Inner glyph / body / peek /
     open slots are this component's own markup. The glyph SVG stroke geometry is already
     shared with the viewer close icon in the global sheet. -->
<style>
  /* This slot: card-wrap — keeps the preview card from overflowing a transcript column. */
  .file-preview-card {
    min-inline-size: 0;
  }

  /* This slot: card — glyph · body · open grid on the Button root (class prop, so :global). */
  .file-preview-card :global(.artifact-card) {
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

  /* This state: hover — Button data-hovered accent tint (via use:hover). */
  .file-preview-card :global(.artifact-card[data-hovered]) {
    border-color: var(--accent-strong);
    background: var(--accent-soft);
  }

  /* This state: pressed — Button data-pressed; no press-scale. */
  .file-preview-card :global(.artifact-card[data-pressed]) {
    transform: none;
  }

  /* This state: focus-visible — canonical card focus ring (never colour-only). */
  .file-preview-card :global(.artifact-card[data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  /* This slot: glyph — the artifact-type glyph chip. */
  .artifact-card--icon {
    display: grid;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    place-items: center;
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* This slot: body — meta · summary · peek column. */
  .artifact-card--body {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-2);
  }

  /* This slot: meta — uppercase fact chips. */
  .artifact-card--meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* This slot: meta-sep — the '/' separator between fact chips. */
  .artifact-card--meta span + span::before {
    margin-inline-end: var(--space-2);
    content: '/';
    color: var(--line-strong);
  }

  /* This slot: summary — the file's display-name read-out. */
  .artifact-card--summary {
    overflow-wrap: anywhere;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.35;
  }

  /* This slot: peek — the clipped metadata well (availability · type · revision · size). */
  /* Do not edit — Peek is clipped and bidi-stable; never expand in the card. */
  .artifact-card-peek {
    display: block;
    min-inline-size: 0;
    max-block-size: calc(1.45em * 6);
    overflow: hidden;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-code);
    color: var(--on-code);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.45;
    text-align: start;
    white-space: pre;
  }

  /* This slot: open — the trailing "Open" handoff affordance. */
  .artifact-card--open {
    min-block-size: 2.75rem;
    padding-block: 0.7rem;
    color: var(--accent-ink);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  /* Editable seam: layout — narrow reflow at <=24rem: drop the trailing Open, tighten glyph + grid. */
  @media (max-width: 24rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .file-preview-card :global(.artifact-card) {
      grid-template-columns: 2.25rem minmax(0, 1fr);
      padding: var(--space-3);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .artifact-card--icon {
      inline-size: 2.25rem;
      block-size: 2.25rem;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .artifact-card--open {
      display: none;
    }
  }

  /* Do not edit — Reduced motion must never re-enable transform motion. */
  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    .file-preview-card :global(.artifact-card) {
      animation: none;
      transition: none;
    }
  }
</style>
