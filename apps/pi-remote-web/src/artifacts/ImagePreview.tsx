import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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

export function ImagePreview({ block, bytes, onStateChange }: ImagePreviewProps) {
  // @ds surface: image-preview — the sanitized image stage with zoom and pan.
  // @ds state: loading · ready · corrupt · too-large — [data-image-state] drives each.
  // @ds guardrail: do-not-edit — the object-URL lifecycle, byte/dimension bounds, zoom clamp,
  //   and pointer pan capture are frozen (the image decode/verify lives in the resource hook).
  const [state, setState] = useState<ImagePreviewState>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(IMAGE_PREVIEW_MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    setZoom(IMAGE_PREVIEW_MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setObjectUrl(null);
    if (
      bytes === null ||
      bytes.byteLength === 0 ||
      bytes.byteLength > IMAGE_PREVIEW_MAX_BYTES ||
      (block.byteLength !== null && bytes.byteLength !== block.byteLength)
    ) {
      setState('too-large');
      return () => {
        active = false;
      };
    }

    const image = new Image();
    const url = URL.createObjectURL(new Blob([bytes.slice()], { type: block.mimeType }));
    setObjectUrl(url);
    image.onload = () => {
      if (!active) return;
      setState(isBoundedImage(image.naturalWidth, image.naturalHeight) ? 'ready' : 'too-large');
    };
    image.onerror = () => {
      if (active) setState('corrupt');
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [block.byteLength, block.digest, block.mimeType, bytes]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  const updatePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current;
    if (start === null || zoom <= IMAGE_PREVIEW_MIN_ZOOM) return;
    setPan({
      x: start.panX + event.clientX - start.x,
      y: start.panY + event.clientY - start.y,
    });
  };

  const stopPan = () => {
    panStartRef.current = null;
  };

  const setBoundedZoom = (next: number) => {
    const bounded = clampZoom(next);
    setZoom(bounded);
    if (bounded === IMAGE_PREVIEW_MIN_ZOOM) setPan({ x: 0, y: 0 });
  };

  const message = messageForState(state);
  return (
    <section className="image-preview" aria-label="Sanitized image preview" data-image-state={state}>
      <div className="image-preview-controls" role="group" aria-label="Image zoom controls">
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => setBoundedZoom(zoom - 1)}
          disabled={zoom <= IMAGE_PREVIEW_MIN_ZOOM}
        >
          Zoom out
        </button>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => setBoundedZoom(IMAGE_PREVIEW_MIN_ZOOM)}
          disabled={zoom === IMAGE_PREVIEW_MIN_ZOOM && pan.x === 0 && pan.y === 0}
        >
          Fit
        </button>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => setBoundedZoom(zoom + 1)}
          disabled={zoom >= IMAGE_PREVIEW_MAX_ZOOM}
        >
          Zoom in
        </button>
      </div>
      {message !== null && (
        <p className="artifact-preview-message" role="alert">
          {message}
        </p>
      )}
      {state === 'loading' && (
        <p className="artifact-preview-message" role="status">
          Loading sanitized image.
        </p>
      )}
      {state === 'ready' && objectUrl !== null && (
        <div
          className="image-preview-stage"
          onDoubleClick={() => setBoundedZoom(zoom === IMAGE_PREVIEW_MIN_ZOOM ? 2 : IMAGE_PREVIEW_MIN_ZOOM)}
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse' && zoom > IMAGE_PREVIEW_MIN_ZOOM) {
              event.currentTarget.setPointerCapture(event.pointerId);
              panStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            }
          }}
          onPointerMove={updatePan}
          onPointerUp={stopPan}
          onPointerCancel={stopPan}
          onPointerLeave={stopPan}
        >
          <img
            className="image-preview-image"
            src={objectUrl}
            alt={block.altText ?? 'Sanitized image preview'}
            draggable={false}
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
          />
        </div>
      )}
    </section>
  );
}

