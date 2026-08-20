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
