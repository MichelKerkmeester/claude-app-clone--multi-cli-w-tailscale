<script module lang="ts">
  import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  export const IMAGE_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
  export const IMAGE_PREVIEW_MAX_DIMENSION = 8_192;
  export const IMAGE_PREVIEW_MAX_PIXELS = 16_000_000;
  export const IMAGE_PREVIEW_MIN_ZOOM = 1;
  export const IMAGE_PREVIEW_MAX_ZOOM = 4;

  export type ImagePreviewState = 'loading' | 'ready' | 'corrupt' | 'too-large';

  export interface ImagePreviewProps {
    readonly block: FilePreviewBlock;
    readonly bytes: Uint8Array | null;
    readonly onStateChange?: (state: ImagePreviewState) => void;
  }

  function isBoundedImage(width: number, height: number): boolean {
    return (
      width > 0 &&
      height > 0 &&
      width <= IMAGE_PREVIEW_MAX_DIMENSION &&
      height <= IMAGE_PREVIEW_MAX_DIMENSION &&
      width * height <= IMAGE_PREVIEW_MAX_PIXELS
    );
  }

  function clampZoom(value: number): number {
    return Math.min(IMAGE_PREVIEW_MAX_ZOOM, Math.max(IMAGE_PREVIEW_MIN_ZOOM, value));
  }

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
  let { block, bytes, onStateChange }: ImagePreviewProps = $props();

  let imageState = $state<ImagePreviewState>('loading');
  let objectUrl = $state<string | null>(null);
  let zoom = $state(IMAGE_PREVIEW_MIN_ZOOM);
  let pan = $state({ x: 0, y: 0 });
  let panStart: { x: number; y: number; panX: number; panY: number } | null = null;

  $effect(() => {
    void block.digest;
    let active = true;
    imageState = 'loading';
    zoom = IMAGE_PREVIEW_MIN_ZOOM;
    pan = { x: 0, y: 0 };
    objectUrl = null;
    const currentBytes = bytes;
    if (
      currentBytes === null ||
      currentBytes.byteLength === 0 ||
      currentBytes.byteLength > IMAGE_PREVIEW_MAX_BYTES ||
      (block.byteLength !== null && currentBytes.byteLength !== block.byteLength)
    ) {
      imageState = 'too-large';
      return () => {
        active = false;
      };
    }

    const image = new Image();
    const url = URL.createObjectURL(new Blob([currentBytes.slice()], { type: block.mimeType }));
    objectUrl = url;
    image.onload = () => {
      if (!active) return;
      imageState = isBoundedImage(image.naturalWidth, image.naturalHeight) ? 'ready' : 'too-large';
    };
    image.onerror = () => {
      if (active) imageState = 'corrupt';
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
      objectUrl = null;
    };
  });

  $effect(() => {
    onStateChange?.(imageState);
  });

  function updatePan(event: PointerEvent): void {
    const start = panStart;
    if (start === null || zoom <= IMAGE_PREVIEW_MIN_ZOOM) return;
    pan = {
      x: start.panX + event.clientX - start.x,
      y: start.panY + event.clientY - start.y,
    };
  }

  function stopPan(): void {
    panStart = null;
  }

  function setBoundedZoom(next: number): void {
    const bounded = clampZoom(next);
    zoom = bounded;
    if (bounded === IMAGE_PREVIEW_MIN_ZOOM) pan = { x: 0, y: 0 };
  }

  const message = $derived(messageForState(imageState));
</script>

<!-- @ds surface: image-preview — the sanitized image stage with zoom and pan. -->
<!-- @ds state: loading · ready · corrupt · too-large — [data-image-state] drives each. -->
<!-- @ds guardrail: do-not-edit — the object-URL lifecycle, byte/dimension bounds, zoom clamp,
     and pointer pan capture are frozen (the image decode/verify lives in the resource hook). -->
<section class="image-preview" aria-label="Sanitized image preview" data-image-state={imageState}>
  <div class="image-preview-controls" role="group" aria-label="Image zoom controls">
    <button type="button" class="artifact-control-button" onclick={() => setBoundedZoom(zoom - 1)} disabled={zoom <= IMAGE_PREVIEW_MIN_ZOOM}>Zoom out</button>
    <button type="button" class="artifact-control-button" onclick={() => setBoundedZoom(IMAGE_PREVIEW_MIN_ZOOM)} disabled={zoom === IMAGE_PREVIEW_MIN_ZOOM && pan.x === 0 && pan.y === 0}>Fit</button>
    <button type="button" class="artifact-control-button" onclick={() => setBoundedZoom(zoom + 1)} disabled={zoom >= IMAGE_PREVIEW_MAX_ZOOM}>Zoom in</button>
  </div>
  {#if message !== null}<p class="artifact-preview-message" role="alert">{message}</p>{/if}
  {#if imageState === 'loading'}<p class="artifact-preview-message" role="status">Loading sanitized image.</p>{/if}
  {#if imageState === 'ready' && objectUrl !== null}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="image-preview-stage"
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
      <img class="image-preview-image" src={objectUrl} alt={block.altText ?? 'Sanitized image preview'} draggable={false} style:transform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`} />
    </div>
  {/if}
</section>
