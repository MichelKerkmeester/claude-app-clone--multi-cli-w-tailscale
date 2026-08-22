<script module lang="ts">
  import type { ArtifactResourceStatus } from './useArtifactResource.svelte.js';

  export interface ImagePan {
    readonly x: number;
    readonly y: number;
  }

  export interface SecureImagePreviewProps {
    readonly objectUrl: string | null;
    readonly alt: string;
    readonly zoom: number;
    readonly pan: ImagePan;
    readonly imageState: 'loading' | 'ready' | 'full-degraded';
    readonly isFull: boolean;
    readonly onPanChange: (pan: ImagePan) => void;
    readonly onZoomChange: (zoom: number) => void;
    readonly onStateChange: (status: ArtifactResourceStatus) => void;
  }

  const IMAGE_MIN_ZOOM = 1;
</script>

<script lang="ts">
  let {
    objectUrl,
    alt,
    zoom,
    pan,
    imageState,
    isFull,
    onPanChange,
    onZoomChange,
    onStateChange,
  }: SecureImagePreviewProps = $props();

  let panStart: { x: number; y: number; panX: number; panY: number } | null = null;

  function updatePan(event: PointerEvent): void {
    const start = panStart;
    if (start === null || zoom <= IMAGE_MIN_ZOOM) return;
    onPanChange({
      x: start.panX + event.clientX - start.x,
      y: start.panY + event.clientY - start.y,
    });
  }

  function stopPan(): void {
    panStart = null;
  }
</script>

{#if objectUrl === null}
  <section class="image-preview" aria-label="Sanitized image preview" data-image-state="loading">
    <p class="artifact-preview-message" role="status">Loading sanitized image.</p>
  </section>
{:else}
  <section class="image-preview" aria-label="Sanitized image preview" data-image-state={imageState}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="image-preview-stage"
      role="group"
      tabindex="0"
      aria-label="Image zoom and pan surface"
      onkeydown={(event) => {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          onZoomChange(zoom + 1);
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          onZoomChange(zoom - 1);
        } else if (event.key === '0') {
          event.preventDefault();
          onZoomChange(IMAGE_MIN_ZOOM);
        } else if (
          event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight'
        ) {
          event.preventDefault();
          const delta = 48;
          onPanChange({
            x:
              pan.x +
              (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0),
            y:
              pan.y +
              (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0),
          });
        }
      }}
      onpointerdown={(event) => {
        if (event.pointerType !== 'mouse' && zoom > IMAGE_MIN_ZOOM) {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          panStart = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
        }
      }}
      onpointermove={updatePan}
      onpointerup={(event) => {
        if (zoom > IMAGE_MIN_ZOOM) event.stopPropagation();
        stopPan();
      }}
      onpointercancel={(event) => {
        if (zoom > IMAGE_MIN_ZOOM) event.stopPropagation();
        stopPan();
      }}
      onpointerleave={stopPan}
    >
      <img
        class="image-preview-image"
        src={objectUrl}
        {alt}
        draggable={false}
        data-pixel-variant={isFull ? 'full' : 'thumbnail'}
        onload={() => {
          if (isFull) onStateChange('ready');
        }}
        onerror={() => {
          if (isFull) onStateChange('corrupt');
        }}
        style:transform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`}
      />
    </div>
  </section>
{/if}
