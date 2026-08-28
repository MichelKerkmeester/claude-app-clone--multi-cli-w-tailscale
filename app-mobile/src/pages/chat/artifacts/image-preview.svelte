<script module lang="ts">
  // This module holds the shared Image Preview types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: IMAGE PREVIEW
  // ───────────────────────────────────────────────────────────────────

  import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 1. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  export const IMAGE_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
  export const IMAGE_PREVIEW_MAX_DIMENSION = 8_192;
  export const IMAGE_PREVIEW_MAX_PIXELS = 16_000_000;
  export const IMAGE_PREVIEW_MIN_ZOOM = 1;
  export const IMAGE_PREVIEW_MAX_ZOOM = 4;

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export type ImagePreviewState = 'loading' | 'ready' | 'corrupt' | 'too-large';

  export interface ImagePreviewProps {
    readonly block: FilePreviewBlock;
    readonly bytes: Uint8Array | null;
    readonly onStateChange?: (state: ImagePreviewState) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep is bounded image focused on its single responsibility.
  function isBoundedImage(width: number, height: number): boolean {
    return (
      width > 0 &&
      height > 0 &&
      width <= IMAGE_PREVIEW_MAX_DIMENSION &&
      height <= IMAGE_PREVIEW_MAX_DIMENSION &&
      width * height <= IMAGE_PREVIEW_MAX_PIXELS
    );
  }

  // Keep clamp zoom focused on its single responsibility.
  function clampZoom(value: number): number {
    return Math.min(IMAGE_PREVIEW_MAX_ZOOM, Math.max(IMAGE_PREVIEW_MIN_ZOOM, value));
  }

  // Keep message for state focused on its single responsibility.
  function messageForState(state: ImagePreviewState): string | null {
    switch (state) {
      case 'corrupt':
        return 'The image could not be verified.';
      case 'too-large':
        return 'The image is too large to preview safely.';
      default:
        return null;
    }
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, bytes, onStateChange }: ImagePreviewProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let imageState = $state<ImagePreviewState>('loading');
  let objectUrl = $state<string | null>(null);
  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let zoom = $state(IMAGE_PREVIEW_MIN_ZOOM);
  let pan = $state({ x: 0, y: 0 });
  let panStart: { x: number; y: number; panX: number; panY: number } | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const message = $derived(messageForState(imageState));

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    void block.digest;
    let active = true;
    untrack(() => {
      imageState = 'loading';
      naturalWidth = 0;
      naturalHeight = 0;
      zoom = IMAGE_PREVIEW_MIN_ZOOM;
      pan = { x: 0, y: 0 };
      objectUrl = null;
    });
    const currentBytes = bytes;
    if (
      currentBytes === null ||
      currentBytes.byteLength === 0 ||
      currentBytes.byteLength > IMAGE_PREVIEW_MAX_BYTES ||
      (block.byteLength !== null && currentBytes.byteLength !== block.byteLength)
    ) {
      untrack(() => {
        imageState = 'too-large';
      });
      return () => {
        active = false;
      };
    }

    const image = new Image();
    const url = URL.createObjectURL(new Blob([currentBytes.slice()], { type: block.mimeType }));
    objectUrl = url;
    image.onload = () => {
      if (!active) return;
      untrack(() => {
        naturalWidth = image.naturalWidth;
        naturalHeight = image.naturalHeight;
        imageState = isBoundedImage(image.naturalWidth, image.naturalHeight) ? 'ready' : 'too-large';
      });
    };
    image.onerror = () => {
      if (active) {
        untrack(() => {
          imageState = 'corrupt';
        });
      }
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
      untrack(() => {
        objectUrl = null;
      });
    };
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    onStateChange?.(imageState);
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep update pan focused on its single responsibility.
  function updatePan(event: PointerEvent): void {
    const start = panStart;
    if (start === null || zoom <= IMAGE_PREVIEW_MIN_ZOOM) return;
    pan = {
      x: start.panX + event.clientX - start.x,
      y: start.panY + event.clientY - start.y,
    };
  }

  // Keep stop pan focused on its single responsibility.
  function stopPan(): void {
    panStart = null;
  }

  // Keep set bounded zoom focused on its single responsibility.
  function setBoundedZoom(next: number): void {
    const bounded = clampZoom(next);
    zoom = bounded;
    if (bounded === IMAGE_PREVIEW_MIN_ZOOM) pan = { x: 0, y: 0 };
  }
</script>

<!-- Component content -->
<!-- Image preview -->
<!-- This surface: image-preview — the sanitized image stage with zoom and pan. -->
<!-- This state: loading · ready · corrupt · too-large — [data-image-state] drives each. -->
<!-- Do not edit — Object-URL lifecycle, byte/dimension bounds, zoom clamping, and pointer-pan capture are frozen; image verification stays in the resource hook. -->
<section class="image-preview" aria-label="Sanitized image preview" data-image-state={imageState}>
  <div class="image-preview--controls" role="group" aria-label="Image zoom controls">
    <button type="button" class="artifact--control-button" onclick={() => setBoundedZoom(zoom - 1)} disabled={zoom <= IMAGE_PREVIEW_MIN_ZOOM}>Zoom out</button>
    <button type="button" class="artifact--control-button" onclick={() => setBoundedZoom(IMAGE_PREVIEW_MIN_ZOOM)} disabled={zoom === IMAGE_PREVIEW_MIN_ZOOM && pan.x === 0 && pan.y === 0}>Fit</button>
    <button type="button" class="artifact--control-button" onclick={() => setBoundedZoom(zoom + 1)} disabled={zoom >= IMAGE_PREVIEW_MAX_ZOOM}>Zoom in</button>
  </div>
  {#if message !== null}<p class="artifact-preview--message" role="alert">{message}</p>{/if}
  {#if imageState === 'loading'}<p class="artifact-preview--message" role="status">Loading sanitized image.</p>{/if}
  {#if imageState === 'ready' && objectUrl !== null}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="image-preview--stage"
      ondblclick={() => setBoundedZoom(zoom === IMAGE_PREVIEW_MIN_ZOOM ? 2 : IMAGE_PREVIEW_MIN_ZOOM)}
      onpointerdown={(event) => {
        if (event.pointerType !== 'mouse' && zoom > IMAGE_PREVIEW_MIN_ZOOM) {
          event.currentTarget.setPointerCapture(event.pointerId);
          panStart = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        }
      }}
      onpointermove={updatePan}
      onpointerup={stopPan}
      onpointercancel={stopPan}
      onpointerleave={stopPan}
    >
      <span class="image-preview--dimensions" aria-label="Intrinsic image dimensions">{naturalWidth} × {naturalHeight}px</span>
      <img class="image-preview--image" src={objectUrl} alt={block.altText ?? 'Sanitized image preview'} draggable={false} style:transform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`} />
    </div>
  {/if}
</section>

<!-- Image preview controls -->
<!-- This surface: image-preview--controls — the image zoom toolbar. Decomposed into this scoped block;
     single-component (ImagePreview). The base image display classes (image-preview / image-preview--image)
     remain shared with SecureImagePreview; this component owns the transparency backdrop and dimensions chip.
     The toolbar buttons carry the shared .artifact--control-button, also global. Values unchanged. -->
<style>
  /* This slot: image-controls — the zoom/pan toolbar row. */
  .image-preview--controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  /* This slot: image-stage — checkerboard squares reveal transparent pixels. */
  .image-preview--stage {
    position: relative;
    background-color: #f8f8f6;
    background-image: linear-gradient(45deg, #e8e4de 25%, transparent 25%, transparent 75%, #e8e4de 75%), linear-gradient(45deg, #e8e4de 25%, transparent 25%, transparent 75%, #e8e4de 75%);
    background-position: 0 0, 0.5rem 0.5rem;
    background-size: 1rem 1rem;
  }

  /* This slot: dimensions — intrinsic pixels remain visible above the image. */
  .image-preview--dimensions {
    position: absolute;
    inset-block-start: var(--space-2);
    inset-inline-end: var(--space-2);
    z-index: 1;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #ffffff;
    color: #24221f;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    padding: 0.45rem 0.6rem;
  }

  /* This state: dark — keeps the transparency pattern distinct on dark surfaces. */
  :global(:root[data-theme='dark']) .image-preview--stage {
    background-color: #24221f;
    background-image: linear-gradient(45deg, #3c3934 25%, transparent 25%, transparent 75%, #3c3934 75%), linear-gradient(45deg, #3c3934 25%, transparent 25%, transparent 75%, #3c3934 75%);
  }

  /* This state: dark — preserves contrast for the intrinsic dimensions chip. */
  :global(:root[data-theme='dark']) .image-preview--dimensions {
    background: #24221f;
    color: #f8f8f6;
  }
</style>
