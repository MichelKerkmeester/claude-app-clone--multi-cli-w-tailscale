<script lang="ts">
  interface Props {
    kind: 'diff' | 'text' | 'markdown' | 'code' | 'image';
    readOnly?: boolean;
    wrap?: boolean;
    onWrapChange?: (wrap: boolean) => void;
    findTerm?: string;
    onFindTermChange?: (term: string) => void;
    canCopy?: boolean;
    canShare?: boolean;
    onCopy?: () => void;
    onShare?: () => void;
    copyLabel?: string;
    zoom?: number;
    onZoomOut?: () => void;
    onFit?: () => void;
    onZoomIn?: () => void;
    onPan?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    onDetails?: () => void;
    detailsOpen?: boolean;
  }

  let {
    kind,
    readOnly = true,
    wrap = false,
    onWrapChange,
    findTerm = '',
    onFindTermChange,
    canCopy = false,
    canShare = false,
    onCopy,
    onShare,
    copyLabel = 'Copy',
    zoom = 1,
    onZoomOut,
    onFit,
    onZoomIn,
    onPan,
    onDetails,
    detailsOpen = false,
  }: Props = $props();

  const KIND_LABELS: Record<Props['kind'], string> = {
    diff: 'Diff',
    text: 'Text',
    markdown: 'Markdown',
    code: 'Code',
    image: 'Image',
  };

  const PAN_DIRECTIONS = ['up', 'left', 'right', 'down'] as const;

  function panGlyph(direction: 'up' | 'down' | 'left' | 'right'): string {
    return direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'left' ? '←' : '→';
  }
</script>

<!-- @ds surface: preview-controls — the per-kind toolbar (find · wrap · zoom · pan · copy · share). -->
<!-- @ds state: kind (diff · text · markdown · code · image) decides which controls render. -->
<!-- @ds guardrail: do-not-edit — the toolbar role=group and each aria-label/aria-pressed are frozen. -->
<div class="artifact-preview-controls" role="group" aria-label="Preview controls">
  <span>{KIND_LABELS[kind]}</span>
  <span>{readOnly ? 'Read-only' : 'Preview'}</span>
  {#if kind === 'image'}
    <span aria-live="polite">{Math.round(zoom * 100)}%</span>
    {#if onZoomOut !== undefined}
      <button type="button" class="artifact-control-button" aria-label="Zoom out" onclick={onZoomOut}>−</button>
    {/if}
    {#if onFit !== undefined}
      <button type="button" class="artifact-control-button" aria-pressed={zoom === 1} onclick={onFit}>Fit</button>
    {/if}
    {#if onZoomIn !== undefined}
      <button type="button" class="artifact-control-button" aria-label="Zoom in" onclick={onZoomIn}>+</button>
    {/if}
    {#if onPan !== undefined}
      <span class="artifact-image-pan-controls" role="group" aria-label="Pan image">
        {#each PAN_DIRECTIONS as direction (direction)}
          <button type="button" class="artifact-control-button" aria-label={`Pan ${direction}`} onclick={() => onPan?.(direction)}>{panGlyph(direction)}</button>
        {/each}
      </span>
    {/if}
    {#if onDetails !== undefined}
      <button type="button" class="artifact-control-button" aria-expanded={detailsOpen} aria-controls="artifact-details" onclick={onDetails}>Details</button>
    {/if}
  {/if}
  {#if onWrapChange !== undefined}
    <button type="button" class="artifact-control-button" aria-pressed={wrap} onclick={() => onWrapChange?.(!wrap)}>{wrap ? 'Unwrap' : 'Wrap'}</button>
  {/if}
  {#if onFindTermChange !== undefined}
    <label class="artifact-find-control">
      <span>Find</span>
      <input type="search" value={findTerm} oninput={(event) => onFindTermChange?.(event.currentTarget.value)} aria-label={`Find in ${KIND_LABELS[kind].toLocaleLowerCase()}`} inputmode="search" />
    </label>
  {/if}
  {#if kind !== 'image' && canCopy && onCopy !== undefined}
    <button type="button" class="artifact-control-button" onclick={onCopy}>{copyLabel}</button>
  {/if}
  {#if kind !== 'image' && canShare && onShare !== undefined}
    <button type="button" class="artifact-control-button" onclick={onShare}>Share</button>
  {/if}
</div>

<!-- @ds surface: artifact-preview-controls — the preview toolbar (chips + pan controls). Decomposed into this scoped block;
     single-component. The chip <span>s and pan <button>s are literal template elements
     (plain scoped). The buttons themselves carry the shared .artifact-control-button class, which stays
     global (→ app.css at cutover). Dark re-ink via :global(:root[data-theme]). Literal hex preserved.
     Values unchanged. -->
<style>
  /* @ds slot: preview-controls — the horizontal toolbar of preview chips + controls. */
  .artifact-preview-controls {
    max-inline-size: 100%;
    align-items: center;
    overflow-x: auto;
    padding-block: 1px;
    color: var(--ink-muted);
    scrollbar-width: thin;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* @ds slot: control-chip — the static status chips (kind, read-only, zoom %). */
  .artifact-preview-controls span {
    min-block-size: 2rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #ffffff;
    color: #24221f;
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.25;
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 0.7rem;
  }

  /* @ds slot: pan-controls — the image pan button cluster; ≥44px targets. */
  .artifact-image-pan-controls button {
    min-inline-size: 44px;
    min-block-size: 44px;
  }

  /* @ds state: dark — dark-theme re-ink (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-preview-controls {
    color: #9f998f;
  }

  /* @ds edit: layout — narrow reflow: wrap the toolbar at <=20rem. */
  @media (max-width: 20rem) {
    .artifact-preview-controls {
      flex-wrap: wrap;
    }
  }

  /* @ds edit: layout — narrow reflow: wrap and un-scroll the toolbar at <=30rem. */
  @media (max-width: 30rem) {
    .artifact-preview-controls {
      flex-wrap: wrap;
      overflow-x: visible;
    }
  }
</style>
