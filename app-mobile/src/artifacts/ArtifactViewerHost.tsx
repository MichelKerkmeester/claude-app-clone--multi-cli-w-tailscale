import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent,
} from 'react';
import {
  isInboundImageReadyBlock,
  isFilePreviewBlock,
  type FileDiffBlock,
  type FilePreviewBlock,
  type InboundImageReadyBlock,
} from '@pi-remote/pi-rpc-protocol';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';

import { useVisualViewportAnchor } from '../useVisualViewportAnchor.js';
import {
  canCopyDisplayedArtifact,
  canShareDisplayedArtifact,
  copyDisplayedArtifact,
  shareDisplayedArtifact,
  type DisplayedArtifactShareInput,
} from './artifact-share.js';
import { ArtifactHeader, type ArtifactHeaderProps } from './ArtifactHeader.js';
import { ArtifactDetails, type ArtifactDetailsModel } from './ArtifactDetails.js';
import { ArtifactStatus } from './ArtifactStatus.js';
import type {
  ArtifactDismissalReason,
  InMemoryArtifactDocument,
  ArtifactPreview,
  ArtifactViewerPhase,
} from './ArtifactViewerProvider.js';
import { CodePreview } from './CodePreview.js';
import { DiffPreview } from './DiffPreview.js';
import { MarkdownPreview } from './MarkdownPreview.js';
import { PdfPreview, type PdfPreviewState } from './PdfPreview.js';
import { PreviewControls } from './PreviewControls.js';
import { TextPreview } from './TextPreview.js';
import { UnsupportedPreview } from './UnsupportedPreview.js';
import { useArtifactResource, type ArtifactResourceStatus } from './useArtifactResource.js';

export interface ArtifactViewerHostProps {
  readonly phase: ArtifactViewerPhase;
  readonly preview: ArtifactPreview | null;
  readonly onClose: (reason: ArtifactDismissalReason) => void;
}

const EDGE_BACK_START = 28;
const EDGE_BACK_DISTANCE = 64;
const EDGE_BACK_CROSS_AXIS = 96;
const IMAGE_MIN_ZOOM = 1;
const IMAGE_MAX_ZOOM = 4;

function isReadyDescriptor(block: FilePreviewBlock): boolean {
  if (block.renderer === 'pdf' && block.textLayerSafe !== true) return false;
  return (block.availability ?? (block.content.kind === 'none' ? 'missing' : 'ready')) === 'ready';
}

function isLegacyDiffSource(value: unknown): value is FileDiffBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { readonly kind?: unknown }).kind === 'file_diff' &&
    typeof (value as { readonly summary?: unknown }).summary === 'string' &&
    typeof (value as { readonly patch?: unknown }).patch === 'string'
  );
}

function isInMemoryArtifactSource(value: unknown): value is InMemoryArtifactDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { readonly kind?: unknown }).kind === 'in-memory' &&
    typeof (value as { readonly id?: unknown }).id === 'string' &&
    typeof (value as { readonly displayName?: unknown }).displayName === 'string' &&
    (value as { readonly renderer?: unknown }).renderer !== undefined &&
    typeof (value as { readonly text?: unknown }).text === 'string' &&
    typeof (value as { readonly summary?: unknown }).summary === 'string' &&
    (value as { readonly redaction?: unknown }).redaction === 'applied'
  );
}

function isInboundImageSource(value: unknown): value is InboundImageReadyBlock {
  return isInboundImageReadyBlock(value);
}

function descriptorSubject(block: FilePreviewBlock): string {
  return block.displayName.length > 0 ? block.displayName : 'redacted file';
}

function descriptorKind(
  block: FilePreviewBlock,
): 'image' | 'pdf' | 'text' | 'markdown' | 'code' | 'diff' | null {
  if (block.mimeType === 'text/markdown' || block.mimeType === 'text/x-markdown') return 'markdown';
  if (
    block.renderer === 'image' ||
    block.renderer === 'pdf' ||
    block.renderer === 'text' ||
    block.renderer === 'code' ||
    block.renderer === 'diff'
  ) {
    return block.renderer;
  }
  return null;
}

function unavailableMessage(block: FilePreviewBlock): string {
  const availability = block.availability ?? (block.content.kind === 'none' ? 'missing' : 'ready');
  if (availability === 'withheld' || block.redaction === 'withheld') {
    return 'The relay withheld this preview.';
  }
  if (availability === 'denied') return 'The relay denied this preview.';
  if (availability === 'missing') return 'This exact revision is not available.';
  if (availability === 'unsupported') return 'This file type is not supported by this reader.';
  if (block.renderer === 'pdf' && block.textLayerSafe !== true) {
    return 'The relay withheld this PDF because its safety could not be attested.';
  }
  if (block.renderer === 'image' || block.renderer === 'pdf') {
    return 'Image and PDF previews are not available in this reader.';
  }
  return 'This preview is unavailable.';
}

function terminalMessage(status: ArtifactResourceStatus): string | null {
  switch (status) {
    case 'offline':
      return 'The relay is offline. No replacement content was loaded.';
    case 'stale':
      return 'The exact revision is stale. Choose View latest to make a fresh exact-revision request.';
    case 'denied':
    case 'expired':
    case 'missing':
    case 'revoked':
    case 'conflict':
    case 'corrupt':
    case 'too-large':
    case 'rate-limited':
    case 'relay-error':
      return 'The preview could not be verified, so no content was committed.';
    default:
      return null;
  }
}

function errorPreviewMessage(status: ArtifactResourceStatus): string {
  switch (status) {
    case 'offline':
      return 'The relay is offline. The frozen exact revision remains closed.';
    case 'stale':
      return 'The frozen exact revision is stale.';
    case 'corrupt':
      return 'The relay response failed exact-revision verification.';
    case 'too-large':
      return 'The response exceeded the bounded preview size.';
    case 'denied':
      return 'The relay denied access to this exact revision.';
    case 'expired':
      return 'This exact revision has expired.';
    case 'missing':
      return 'This exact revision is missing.';
    case 'revoked':
      return 'This exact revision was revoked.';
    case 'rate-limited':
      return 'The relay temporarily rate-limited this exact revision.';
    default:
      return 'The exact revision could not be loaded.';
  }
}

function inMemoryStatusMessage(document: InMemoryArtifactDocument): string | null {
  switch (document.sourceState) {
    case 'stale-cache':
      return 'This is a stale cached snapshot. No replacement content was loaded.';
    case 'connection-lost':
      return 'The connection was lost. The last trustworthy redacted snapshot remains visible.';
    case 'terminal-without-result':
      return 'The command reached a terminal state without a result.';
    case 'source-removed':
      return 'The source was removed. The last trustworthy redacted snapshot remains visible.';
    default:
      return null;
  }
}

function isResourceError(status: ArtifactResourceStatus): boolean {
  return [
    'offline',
    'stale',
    'denied',
    'expired',
    'missing',
    'revoked',
    'conflict',
    'corrupt',
    'too-large',
    'rate-limited',
    'relay-error',
    'aborted',
    'closed',
  ].includes(status);
}

interface ImagePan {
  readonly x: number;
  readonly y: number;
}

interface SecureImagePreviewProps {
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

// @ds guardrail: do-not-edit — SecureImagePreview renders only the verified object URL handed in
// by the resource hook (decode/verify/re-encode live there). The pan/zoom pointer + keyboard
// surface is react-aria-free and frozen; do not change its behaviour or a11y.
function SecureImagePreview({
  objectUrl,
  alt,
  zoom,
  pan,
  imageState,
  isFull,
  onPanChange,
  onZoomChange,
  onStateChange,
}: SecureImagePreviewProps) {
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const updatePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current;
    if (start === null || zoom <= IMAGE_MIN_ZOOM) return;
    onPanChange({
      x: start.panX + event.clientX - start.x,
      y: start.panY + event.clientY - start.y,
    });
  };
  const stopPan = () => {
    panStartRef.current = null;
  };
  if (objectUrl === null) {
    return (
      <section
        className="image-preview"
        aria-label="Sanitized image preview"
        data-image-state="loading"
      >
        <p className="artifact-preview-message" role="status">
          Loading sanitized image.
        </p>
      </section>
    );
  }
  return (
    <section
      className="image-preview"
      aria-label="Sanitized image preview"
      data-image-state={imageState}
    >
      <div
        className="image-preview-stage"
        role="group"
        tabIndex={0}
        aria-label="Image zoom and pan surface"
        onKeyDown={(event) => {
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
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && zoom > IMAGE_MIN_ZOOM) {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            panStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
          }
        }}
        onPointerMove={updatePan}
        onPointerUp={(event) => {
          if (zoom > IMAGE_MIN_ZOOM) event.stopPropagation();
          stopPan();
        }}
        onPointerCancel={(event) => {
          if (zoom > IMAGE_MIN_ZOOM) event.stopPropagation();
          stopPan();
        }}
        onPointerLeave={stopPan}
      >
        <img
          className="image-preview-image"
          src={objectUrl}
          alt={alt}
          draggable={false}
          data-pixel-variant={isFull ? 'full' : 'thumbnail'}
          onLoad={() => {
            if (isFull) onStateChange('ready');
          }}
          onError={() => {
            if (isFull) onStateChange('corrupt');
          }}
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
        />
      </div>
    </section>
  );
}

function renderDescriptor(
  block: FilePreviewBlock,
  status: ArtifactResourceStatus,
  text: string | null,
  bytes: Uint8Array | null,
  objectUrl: string | null,
  imageAlt: string,
  imageZoom: number,
  imagePan: ImagePan,
  onImagePanChange: (pan: ImagePan) => void,
  onImageZoomChange: (zoom: number) => void,
  wrap: boolean,
  findTerm: string,
  resourceReady: boolean,
  onRendererStatus: (status: ArtifactResourceStatus) => void,
  onPdfRendererStatus: (status: PdfPreviewState) => void,
  onFindTermChange: (term: string) => void,
): React.ReactNode {
  if (!isReadyDescriptor(block)) {
    return (
      <div role="alert">
        <UnsupportedPreview renderer={block.renderer} message={unavailableMessage(block)} />
      </div>
    );
  }
  if (descriptorKind(block) === null) {
    return (
      <div role="alert">
        <UnsupportedPreview renderer={block.renderer} message={unavailableMessage(block)} />
      </div>
    );
  }
  if (!resourceReady && (status === 'loading' || status === 'stalled' || status === 'idle')) {
    return (
      <div className="artifact-loading-preview" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (!resourceReady && isResourceError(status)) {
    return (
      <div role="alert">
        <UnsupportedPreview renderer={block.renderer} message={errorPreviewMessage(status)} />
      </div>
    );
  }
  if (block.renderer === 'image') {
    return (
      <SecureImagePreview
        objectUrl={objectUrl}
        alt={imageAlt}
        zoom={imageZoom}
        pan={imagePan}
        imageState="ready"
        isFull
        onPanChange={onImagePanChange}
        onZoomChange={onImageZoomChange}
        onStateChange={onRendererStatus}
      />
    );
  }
  if (block.renderer === 'pdf') {
    return (
      <PdfPreview
        block={block}
        bytes={bytes}
        findTerm={findTerm}
        onFindTermChange={onFindTermChange}
        onStateChange={onPdfRendererStatus}
      />
    );
  }
  if (text === null) return <UnsupportedPreview renderer={block.renderer} />;
  if (block.mimeType === 'text/markdown' || block.mimeType === 'text/x-markdown') {
    return <MarkdownPreview text={text} findTerm={findTerm} />;
  }
  switch (block.renderer) {
    case 'text':
      return <TextPreview text={text} wrap={wrap} findTerm={findTerm} />;
    case 'code':
      return (
        <CodePreview
          text={text}
          {...(block.language === undefined ? {} : { language: block.language })}
          wrap={wrap}
          findTerm={findTerm}
        />
      );
    case 'diff':
      return <DiffPreview patch={text} wrap={wrap} findTerm={findTerm} />;
    default:
      return <UnsupportedPreview renderer={block.renderer} />;
  }
}

function renderInMemoryDocument(
  document: InMemoryArtifactDocument,
  wrap: boolean,
  findTerm: string,
): React.ReactNode {
  switch (document.renderer) {
    case 'text':
      return (
        <TextPreview
          text={document.text}
          wrap={wrap}
          findTerm={findTerm}
          ariaLabel={`${document.displayName} preview`}
        />
      );
    case 'code':
      return (
        <CodePreview
          text={document.text}
          {...(document.language === undefined ? {} : { language: document.language })}
          {...(document.revision === undefined ? {} : { revision: document.revision })}
          wrap={wrap}
          findTerm={findTerm}
          ariaLabel={`${document.displayName} code preview`}
          followTail={document.live === true}
        />
      );
    case 'diff':
      return <DiffPreview patch={document.text} wrap={wrap} findTerm={findTerm} />;
  }
}

export function ArtifactViewerHost({ phase, preview, onClose }: ArtifactViewerHostProps) {
  // @ds surface: artifact-viewer — the modal reader chrome: header, status, controls, preview body.
  // @ds slot: header | status | controls | body — the chrome regions styled in the matching
  //   @ds surface: artifact-viewer style.css block.
  // @ds guardrail: do-not-edit — the hooks below are the digest-verified, race-safe,
  //   no-fetch-on-open exact-tuple reader; do not rework their wiring.
  useVisualViewportAnchor();
  const hasPreview = preview !== null;
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const edgeStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const [wrap, setWrap] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [rendererStatus, setRendererStatus] = useState<ArtifactResourceStatus | null>(null);
  const [imageZoom, setImageZoom] = useState(IMAGE_MIN_ZOOM);
  const [imagePan, setImagePan] = useState<ImagePan>({ x: 0, y: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const sourceValue: unknown = preview?.source;
  const legacyDiff: FileDiffBlock | null =
    sourceValue !== undefined && isLegacyDiffSource(sourceValue) ? sourceValue : null;
  const inMemory: InMemoryArtifactDocument | null =
    sourceValue !== undefined && isInMemoryArtifactSource(sourceValue) ? sourceValue : null;
  const descriptor: FilePreviewBlock | null =
    sourceValue !== undefined && isFilePreviewBlock(sourceValue) ? sourceValue : null;
  const inbound: InboundImageReadyBlock | null =
    sourceValue !== undefined && isInboundImageSource(sourceValue) ? sourceValue : null;
  const resourceBlock = descriptor ?? inbound;
  const sessionId = preview?.sessionId ?? preview?.trigger?.dataset.artifactSessionId ?? null;
  const resourceEnabled =
    ((descriptor !== null &&
      isReadyDescriptor(descriptor) &&
      descriptorKind(descriptor) !== null) ||
      inbound !== null) &&
    phase !== 'exiting' &&
    phase !== 'privacy-covered' &&
    phase !== 'closing';
  const thumbnailResource = useArtifactResource(sessionId, inbound, {
    enabled: resourceEnabled && inbound !== null,
    variant: 'thumbnail',
    requireImageDecode: true,
  });
  // @ds guardrail: do-not-edit — useArtifactResource is the digest-verified, race-safe,
  // no-fetch-on-open exact-tuple read. requireImageDecode sanitizes the image (PNG decode/
  // re-encode metadata-strip) before any object URL is created. Keep behaviour unchanged.
  const resource = useArtifactResource(sessionId, resourceBlock, {
    enabled: resourceEnabled,
    variant: 'full',
    requireImageDecode: inbound !== null || descriptor?.renderer === 'image',
  });
  const thumbnailCloseRef = useRef(thumbnailResource.close);
  thumbnailCloseRef.current = thumbnailResource.close;
  const resourceCloseRef = useRef(resource.close);
  resourceCloseRef.current = resource.close;
  const resourceReloadRef = useRef(resource.reload);
  resourceReloadRef.current = resource.reload;
  const onRendererStatus = useCallback(
    (status: ArtifactResourceStatus) => setRendererStatus(status),
    [],
  );
  const onPdfRendererStatus = useCallback(
    (status: PdfPreviewState) => onRendererStatus(status === 'withheld' ? 'relay-error' : status),
    [onRendererStatus],
  );

  useEffect(() => {
    if (phase === 'exiting' || phase === 'privacy-covered' || phase === 'closing') {
      thumbnailCloseRef.current();
      resourceCloseRef.current();
    }
  }, [phase]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        thumbnailCloseRef.current();
        resourceCloseRef.current();
      } else if (phase === 'ready-diff' && descriptor !== null) {
        resourceReloadRef.current();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && phase === 'ready-diff' && descriptor !== null) {
        resourceCloseRef.current();
        resourceReloadRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [phase]);

  useEffect(() => {
    setWrap(false);
    setFindTerm('');
    setCopyLabel('Copy');
    setAnnouncement(null);
    setRendererStatus(null);
    setImageZoom(IMAGE_MIN_ZOOM);
    setImagePan({ x: 0, y: 0 });
    setDetailsOpen(false);
  }, [preview?.generation]);

  useEffect(() => {
    if (
      announcement === 'Requesting the same exact revision again.' &&
      resource.status !== 'stale'
    ) {
      setAnnouncement(null);
    }
  }, [announcement, resource.status]);

  useEffect(() => {
    if (!hasPreview || (phase !== 'opening' && phase !== 'ready-diff' && phase !== 'ready-image'))
      return undefined;
    const timer = window.setTimeout(() => {
      headingRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasPreview, phase, preview?.generation]);

  useEffect(() => {
    if (phase !== 'ready-diff' && phase !== 'ready-image') return undefined;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !dialogRef.current?.contains(target)) {
        onClose('voiceover-scrub');
      }
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, [onClose, phase]);

  if (preview === null || phase === 'closed') return null;

  // @ds state: edge-back · voiceover-scrub — swipe-from-edge and focus-scrub dismissal reasons.
  // @ds guardrail: do-not-edit — gesture thresholds and the pointer/touch wiring are frozen.
  const startEdgeBack = (x: number, y: number) => {
    if (x <= EDGE_BACK_START) edgeStartRef.current = { x, y };
  };
  const finishEdgeBack = (x: number, y: number) => {
    const start = edgeStartRef.current;
    edgeStartRef.current = null;
    if (
      start !== null &&
      x - start.x >= EDGE_BACK_DISTANCE &&
      Math.abs(y - start.y) < EDGE_BACK_CROSS_AXIS
    ) {
      onClose('edge-back');
    }
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') startEdgeBack(event.clientX, event.clientY);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') finishEdgeBack(event.clientX, event.clientY);
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch !== undefined) startEdgeBack(touch.clientX, touch.clientY);
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch !== undefined) finishEdgeBack(touch.clientX, touch.clientY);
  };

  const setBoundedImageZoom = (next: number) => {
    const bounded = Math.min(IMAGE_MAX_ZOOM, Math.max(IMAGE_MIN_ZOOM, next));
    setImageZoom(bounded);
    if (bounded === IMAGE_MIN_ZOOM) setImagePan({ x: 0, y: 0 });
  };
  const panImage = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (imageZoom <= IMAGE_MIN_ZOOM) return;
    const delta = 48;
    setImagePan((current) => ({
      x: current.x + (direction === 'left' ? -delta : direction === 'right' ? delta : 0),
      y: current.y + (direction === 'up' ? -delta : direction === 'down' ? delta : 0),
    }));
  };
  const kind =
    inbound !== null
      ? 'image'
      : (inMemory?.renderer ?? (descriptor === null ? 'diff' : descriptorKind(descriptor)));
  const subject =
    inMemory?.displayName ??
    inbound?.displayName ??
    (descriptor === null ? 'Redacted file diff' : descriptorSubject(descriptor));
  const title =
    inMemory?.displayName ??
    inbound?.displayName ??
    (descriptor === null ? 'File diff' : descriptorSubject(descriptor));
  const resourceStatus = resourceBlock === null ? null : resource.status;
  const currentStatus =
    resourceBlock === null
      ? null
      : inbound !== null || isReadyDescriptor(descriptor as FilePreviewBlock)
        ? (rendererStatus ?? resource.status)
        : null;
  const binaryPreviewReady =
    descriptor !== null &&
    (descriptor.renderer === 'image' || descriptor.renderer === 'pdf') &&
    resource.status === 'ready' &&
    rendererStatus === 'ready';
  const imageObjectUrl = resource.objectUrl ?? thumbnailResource.objectUrl;
  const imageIsFull = resource.objectUrl !== null;
  const imageState: 'loading' | 'ready' | 'full-degraded' =
    imageIsFull
      ? 'ready'
      : thumbnailResource.objectUrl !== null &&
          (resource.status === 'stalled' || isResourceError(resource.status))
        ? 'full-degraded'
        : 'loading';
  const body =
    inMemory !== null ? (
      renderInMemoryDocument(inMemory, wrap, findTerm)
    ) : inbound !== null ? (
      imageObjectUrl !== null ? (
        <SecureImagePreview
          objectUrl={imageObjectUrl}
          alt={inbound.presentation.safeAlt}
          zoom={imageZoom}
          pan={imagePan}
          imageState={imageState}
          isFull={imageIsFull}
          onPanChange={setImagePan}
          onZoomChange={setBoundedImageZoom}
          onStateChange={onRendererStatus}
        />
      ) : resource.status === 'loading' ||
        resource.status === 'stalled' ||
        thumbnailResource.status === 'loading' ||
        thumbnailResource.status === 'stalled' ? (
        <div className="artifact-loading-preview" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div role="alert">
          <UnsupportedPreview renderer="image" message={errorPreviewMessage(resource.status)} />
        </div>
      )
    ) : descriptor === null ? (
      legacyDiff === null ? (
        <UnsupportedPreview message="The preview source could not be verified." />
      ) : (
        <DiffPreview patch={legacyDiff.patch} wrap={wrap} findTerm={findTerm} />
      )
    ) : (
      renderDescriptor(
        descriptor,
        currentStatus ?? resource.status,
        resource.text,
        resource.bytes,
        resource.objectUrl,
        descriptor.altText ?? 'Sanitized image preview',
        imageZoom,
        imagePan,
        setImagePan,
        setBoundedImageZoom,
        wrap,
        findTerm,
        resource.status === 'ready' &&
          (descriptor.renderer !== 'image' || resource.objectUrl !== null),
        onRendererStatus,
        onPdfRendererStatus,
        setFindTerm,
      )
    );
  const displayedBuffer =
    inMemory !== null
      ? inMemory.text
      : inbound !== null || descriptor === null
        ? (legacyDiff?.patch ?? null)
        : resource.buffer;
  // @ds guardrail: do-not-edit — Copy writes the exact displayed buffer; Share is policy-gated
  // by artifact-share (canShareDisplayedArtifact / shareDisplayedArtifact). Wiring is unchanged.
  const shareInput: DisplayedArtifactShareInput = {
    displayName: title,
    renderer: inMemory?.renderer ?? descriptor?.renderer ?? 'diff',
    displayedBuffer: displayedBuffer ?? '',
    shareAllowed: inMemory === null ? (descriptor?.shareAllowed ?? false) : false,
    redaction: inMemory !== null ? 'applied' : (descriptor?.redaction ?? 'not-needed'),
    completeness: descriptor?.completeness ?? 'complete',
    ...(binaryPreviewReady && resource.bytes !== null
      ? { displayedBytes: resource.bytes, mimeType: descriptor.mimeType }
      : {}),
  };
  const displayedBytes = binaryPreviewReady ? resource.bytes : null;
  const canCopy = inbound === null && displayedBuffer !== null && canCopyDisplayedArtifact();
  const canShare =
    inbound === null &&
    (displayedBuffer !== null || displayedBytes !== null) &&
    canShareDisplayedArtifact(shareInput);
  const terminal =
    inMemory !== null
      ? inMemoryStatusMessage(inMemory)
      : inbound !== null
        ? resourceStatus === null
          ? null
          : terminalMessage(currentStatus ?? resourceStatus)
        : inMemory === null && legacyDiff === null && descriptor === null
          ? 'The preview source could not be verified.'
          : descriptor !== null && !isReadyDescriptor(descriptor)
            ? unavailableMessage(descriptor)
            : descriptor !== null && descriptorKind(descriptor) === null
              ? unavailableMessage(descriptor)
              : resourceStatus !== null
                ? terminalMessage(currentStatus ?? resourceStatus)
                : null;
  const statusAnnouncement =
    announcement ??
    (inbound !== null
      ? null
      : inMemory === null && descriptor === null && legacyDiff === null
        ? 'The preview source could not be verified.'
        : descriptor !== null &&
            (!isReadyDescriptor(descriptor) || descriptorKind(descriptor) === null)
          ? unavailableMessage(descriptor)
          : null);
  const statusPhase = phase === 'opening' && inbound === null ? 'ready-diff' : phase;
  const status = phase === 'opening' && inbound === null ? null : currentStatus;
  const viewerState: ArtifactViewerPhase =
    phase === 'privacy-covered' || phase === 'closing'
      ? 'privacy-covered'
      : inbound === null
        ? phase
        : resource.status === 'stalled'
          ? 'stalled'
          : resource.offlineLoaded === true
            ? 'offline-loaded'
            : resource.status === 'offline'
              ? 'offline-unavailable'
              : resource.status === 'stale'
                ? 'stale'
                : resource.status === 'revoked'
                  ? 'revoked'
                  : resource.status === 'aborted'
                    ? 'aborted'
                    : resource.objectUrl !== null
                      ? 'viewer-ready'
                      : thumbnailResource.objectUrl !== null && isResourceError(resource.status)
                        ? 'full-degraded'
                        : 'full-fetching';
  const kindLabel =
    inMemory !== null
      ? `Redacted ${kind ?? 'artifact'}`
      : inbound !== null
        ? 'Redacted image'
        : descriptor === null
          ? 'Redacted artifact'
          : `Redacted ${kind ?? 'artifact'}`;
  const headerProps: ArtifactHeaderProps = {
    headingRef,
    onClose: () => onClose('close'),
    title,
    kindLabel,
    revision:
      inbound?.artifact.revision ??
      descriptor?.revision ??
      (inMemory?.revision === undefined ? null : String(inMemory.revision)),
  };
  const imageDetails: ArtifactDetailsModel | null =
    inbound === null
      ? null
      : {
          displayName: inbound.displayName,
          mediaType: inbound.artifact.full.mediaType,
          width: inbound.artifact.full.width,
          height: inbound.artifact.full.height,
          thumbnailBytes: inbound.artifact.thumbnail.byteLength,
          fullBytes: inbound.artifact.full.byteLength,
          revision: inbound.artifact.revision,
          processing: 'complete',
          redaction: inbound.redaction.status,
        };
  const onCopy = () => {
    if (displayedBuffer === null) return;
    void copyDisplayedArtifact(displayedBuffer).then((copied) => {
      if (!copied) {
        setAnnouncement('Copy was unavailable.');
        return;
      }
      setCopyLabel('Copied');
      setAnnouncement('Displayed preview copied.');
      window.setTimeout(() => setCopyLabel('Copy'), 1_500);
    });
  };
  const onShare = () => {
    void shareDisplayedArtifact(shareInput).then((result) => {
      if (result === 'shared') setAnnouncement('Displayed preview shared.');
      else if (result === 'cancelled') setAnnouncement('Share cancelled.');
      else if (result === 'failed') setAnnouncement('Share failed.');
    });
  };

  // @ds state: the viewer phase (closed · opening · ready-diff · ready-image · viewer-ready ·
  //   full-fetching · stalled · offline-* · stale · revoked · privacy-covered · exiting ·
  //   aborted) drives [data-artifact-state] on the overlay and the preview body below.
  // @ds guardrail: do-not-edit — react-aria ModalOverlay/Modal/Dialog wiring, focus trap,
  //   isDismissable/onOpenChange, edge-back handlers, and aria attributes are frozen.
  return (
    <ModalOverlay
      isOpen
      isDismissable={inbound === null}
      className="artifact-viewer-overlay"
      data-artifact-state={viewerState}
      data-privacy-covered={viewerState === 'privacy-covered' ? 'true' : undefined}
      onOpenChange={(open) => {
        if (!open) onClose('escape');
      }}
    >
      <Modal className="artifact-viewer-modal">
        <Dialog
          ref={dialogRef}
          aria-label={
            inbound !== null
              ? 'Image preview viewer'
              : `${title === 'File diff' ? 'File diff' : 'File preview'} viewer`
          }
          aria-describedby="artifact-viewer-summary"
          className="artifact-viewer-dialog"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ArtifactHeader {...headerProps} />
          <ArtifactStatus
            phase={statusPhase}
            status={status}
            subject={subject}
            announcement={statusAnnouncement}
            terminalMessage={terminal}
          />
          <div className="artifact-viewer-content">
            <p id="artifact-viewer-summary" className="artifact-viewer-summary" dir="auto">
              {inMemory !== null
                ? inMemory.summary
                : inbound !== null
                  ? `${inbound.artifact.full.mediaType} · ${inbound.artifact.full.width} × ${inbound.artifact.full.height} · Redacted`
                  : descriptor === null
                    ? (legacyDiff?.summary ?? 'Unverified preview source')
                    : `${descriptor.mimeType} · ${descriptor.completeness === 'excerpt' ? 'Excerpt' : 'Complete'} · ${descriptor.redaction === 'applied' ? 'Redacted' : 'Relay-sanitized'}`}
            </p>
            <PreviewControls
              kind={kind === 'pdf' ? 'text' : (kind ?? 'text')}
              wrap={wrap}
              findTerm={findTerm}
              {...(kind === 'text' || kind === 'code' || kind === 'diff'
                ? { onWrapChange: setWrap }
                : {})}
              {...(kind === 'text' || kind === 'code' || kind === 'diff' || kind === 'markdown'
                ? { onFindTermChange: setFindTerm }
                : {})}
              canCopy={canCopy}
              canShare={canShare}
              onCopy={onCopy}
              onShare={onShare}
              copyLabel={copyLabel}
              {...(kind === 'image'
                ? {
                    zoom: imageZoom,
                    onZoomOut: () => setBoundedImageZoom(imageZoom - 1),
                    onFit: () => setBoundedImageZoom(IMAGE_MIN_ZOOM),
                    onZoomIn: () => setBoundedImageZoom(imageZoom + 1),
                    onPan: panImage,
                    ...(imageDetails === null
                      ? {}
                      : {
                          onDetails: () => setDetailsOpen((current) => !current),
                          detailsOpen,
                        }),
                  }
                : {})}
            />
            {imageDetails !== null && <ArtifactDetails model={imageDetails} open={detailsOpen} />}
            {descriptor !== null && resource.status === 'stale' && (
              <button
                type="button"
                className="artifact-stale-action"
                onClick={() => {
                  setAnnouncement('Requesting the same exact revision again.');
                  resource.reload();
                }}
              >
                View latest
              </button>
            )}
            <div className="artifact-preview-region">{body}</div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
