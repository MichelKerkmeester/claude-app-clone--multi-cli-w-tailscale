<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ARTIFACT VIEWER HOST
  // ───────────────────────────────────────────────────────────────────

  import {
    isInboundImageReadyBlock,
    isFilePreviewBlock,
    type FileDiffBlock,
    type FilePreviewBlock,
    type InboundImageReadyBlock,
  } from '@pi-remote/pi-rpc-protocol';

  import type {
    ArtifactDismissalReason,
    ArtifactPreview,
    ArtifactViewerPhase,
    InMemoryArtifactDocument,
  } from './types.js';
  import type { ArtifactResourceStatus } from './use-artifact-resource.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface ArtifactViewerHostProps {
    readonly phase: ArtifactViewerPhase;
    readonly preview: ArtifactPreview | null;
    readonly onClose: (reason: ArtifactDismissalReason) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const EDGE_BACK_START = 28;
  const EDGE_BACK_DISTANCE = 64;
  const EDGE_BACK_CROSS_AXIS = 96;
  const IMAGE_MIN_ZOOM = 1;
  const IMAGE_MAX_ZOOM = 4;

  const FOCUS_TRAP_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

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
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { useVisualViewportAnchor } from '$shared/viewport/use-visual-viewport-anchor.svelte.js';
  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';
  import {
    canCopyDisplayedArtifact,
    canShareDisplayedArtifact,
    copyDisplayedArtifact,
    shareDisplayedArtifact,
    type DisplayedArtifactShareInput,
  } from './artifact-share.js';
  import ArtifactDetails, { type ArtifactDetailsModel } from './artifact-details.svelte';
  import ArtifactHeader from './artifact-header.svelte';
  import ArtifactStatus from './artifact-status.svelte';
  import CodePreview from './code-preview.svelte';
  import DiffPreview from './diff-preview.svelte';
  import MarkdownPreview from './markdown-preview.svelte';
  import PdfPreview, { type PdfPreviewState } from './pdf-preview.svelte';
  import PreviewControls from './preview-controls.svelte';
  import SecureImagePreview, { type ImagePan } from './secure-image-preview.svelte';
  import TextPreview from './text-preview.svelte';
  import UnsupportedPreview from './unsupported-preview.svelte';
  import { useArtifactResource } from './use-artifact-resource.svelte.js';

  import './artifact-viewer-host.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { phase, preview, onClose }: ArtifactViewerHostProps = $props();

  // @ds surface: artifact-viewer — the modal reader chrome: header, status, controls, preview body.
  // @ds slot: header | status | controls | body — the chrome regions styled in the matching
  //   @ds surface: artifact-viewer co-located CSS file.
  // @ds guardrail: do-not-edit — The hooks below are the digest-verified, race-safe, no-fetch-on-open exact-tuple reader wiring; do not rework them.
  useVisualViewportAnchor();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let dialogEl = $state<HTMLElement | null>(null);
  let headingRef = $state<HTMLHeadingElement | null>(null);
  let edgeStart: { readonly x: number; readonly y: number } | null = null;
  let wrap = $state(false);
  let findTerm = $state('');
  let copyLabel = $state('Copy');
  let announcement = $state<string | null>(null);
  let rendererStatus = $state<ArtifactResourceStatus | null>(null);
  let imageZoom = $state(IMAGE_MIN_ZOOM);
  let imagePan = $state<ImagePan>({ x: 0, y: 0 });
  let detailsOpen = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    if (preview === null || phase === 'closed' || dialogEl === null) return;
    return hideOutside([dialogEl]);
  });

  const setWrap = (value: boolean): void => {
    wrap = value;
  };
  const setFindTerm = (value: string): void => {
    findTerm = value;
  };
  const setImagePan = (value: ImagePan): void => {
    imagePan = value;
  };

  // ───────────────────────────────────────────────────────────────────
  // 8. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const sourceValue = $derived<unknown>(preview?.source);
  const legacyDiff = $derived<FileDiffBlock | null>(
    sourceValue !== undefined && isLegacyDiffSource(sourceValue) ? sourceValue : null,
  );
  const inMemory = $derived<InMemoryArtifactDocument | null>(
    sourceValue !== undefined && isInMemoryArtifactSource(sourceValue) ? sourceValue : null,
  );
  const descriptor = $derived<FilePreviewBlock | null>(
    sourceValue !== undefined && isFilePreviewBlock(sourceValue) ? sourceValue : null,
  );
  const inbound = $derived<InboundImageReadyBlock | null>(
    sourceValue !== undefined && isInboundImageSource(sourceValue) ? sourceValue : null,
  );
  const resourceBlock = $derived(descriptor ?? inbound);
  const sessionId = $derived(
    preview?.sessionId ?? preview?.trigger?.dataset.artifactSessionId ?? null,
  );
  const resourceEnabled = $derived(
    ((descriptor !== null &&
      isReadyDescriptor(descriptor) &&
      descriptorKind(descriptor) !== null) ||
      inbound !== null) &&
      phase !== 'exiting' &&
      phase !== 'privacy-covered' &&
      phase !== 'closing',
  );

  const thumbnail = useArtifactResource(
    () => sessionId,
    () => inbound,
    () => ({
      enabled: resourceEnabled && inbound !== null,
      variant: 'thumbnail',
      requireImageDecode: true,
    }),
  );
  // @ds guardrail: do-not-edit — useArtifactResource is the digest-verified, race-safe, no-fetch-on-open exact-tuple read; requireImageDecode sanitizes image bytes before any object URL exists. Keep behaviour unchanged.
  const resource = useArtifactResource(
    () => sessionId,
    () => resourceBlock,
    () => ({
      enabled: resourceEnabled,
      variant: 'full',
      requireImageDecode: inbound !== null || descriptor?.renderer === 'image',
    }),
  );

  const thumbnailCloseFn = thumbnail.current.close;
  const resourceCloseFn = resource.current.close;
  const resourceReloadFn = resource.current.reload;

  const thumbnailSnapshot = $derived(thumbnail.current);
  const resourceSnapshot = $derived(resource.current);

  function onRendererStatus(status: ArtifactResourceStatus): void {
    rendererStatus = status;
  }
  function onPdfRendererStatus(status: PdfPreviewState): void {
    onRendererStatus(status === 'withheld' ? 'relay-error' : status);
  }

  $effect(() => {
    if (phase === 'exiting' || phase === 'privacy-covered' || phase === 'closing') {
      thumbnailCloseFn();
      resourceCloseFn();
    }
  });

  $effect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        thumbnailCloseFn();
        resourceCloseFn();
      } else if (phase === 'ready-diff' && descriptor !== null) {
        resourceReloadFn();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && phase === 'ready-diff' && descriptor !== null) {
        resourceCloseFn();
        resourceReloadFn();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  });

  $effect(() => {
    void preview?.generation;
    wrap = false;
    findTerm = '';
    copyLabel = 'Copy';
    announcement = null;
    rendererStatus = null;
    imageZoom = IMAGE_MIN_ZOOM;
    imagePan = { x: 0, y: 0 };
    detailsOpen = false;
  });

  $effect(() => {
    if (
      announcement === 'Requesting the same exact revision again.' &&
      resourceSnapshot.status !== 'stale'
    ) {
      announcement = null;
    }
  });

  $effect(() => {
    const active =
      preview !== null &&
      (phase === 'opening' || phase === 'ready-diff' || phase === 'ready-image');
    void preview?.generation;
    if (!active) return;
    const timer = window.setTimeout(() => {
      headingRef?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  });

  // @ds guardrail: do-not-edit — VoiceOver focus-scrub past the modal boundary dismisses the reader; the capture-phase focusin containment check is frozen a11y behaviour.
  $effect(() => {
    if (phase !== 'ready-diff' && phase !== 'ready-image') return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && dialogEl?.contains(target) !== true) {
        onClose('voiceover-scrub');
      }
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // @ds state: edge-back · voiceover-scrub — swipe-from-edge and focus-scrub dismissal reasons.
  // @ds guardrail: do-not-edit — Gesture thresholds and the pointer/touch wiring are frozen.
  function startEdgeBack(x: number, y: number): void {
    if (x <= EDGE_BACK_START) edgeStart = { x, y };
  }
  function finishEdgeBack(x: number, y: number): void {
    const start = edgeStart;
    edgeStart = null;
    if (
      start !== null &&
      x - start.x >= EDGE_BACK_DISTANCE &&
      Math.abs(y - start.y) < EDGE_BACK_CROSS_AXIS
    ) {
      onClose('edge-back');
    }
  }
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') startEdgeBack(event.clientX, event.clientY);
  }
  function onPointerUp(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') finishEdgeBack(event.clientX, event.clientY);
  }
  function onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (touch !== undefined) startEdgeBack(touch.clientX, touch.clientY);
  }
  function onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (touch !== undefined) finishEdgeBack(touch.clientX, touch.clientY);
  }

  // @ds guardrail: do-not-edit — Escape always dismisses under the react-aria contract, and Tab stays inside the dialog so focus never scrubs out.
  function onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose('escape');
      return;
    }
    if (event.key !== 'Tab') return;
    const root = dialogEl;
    if (root === null) return;
    const focusables = [...root.querySelectorAll<HTMLElement>(FOCUS_TRAP_SELECTOR)].filter(
      (element) => element.getAttribute('aria-hidden') !== 'true',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      root.focus();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === root || root.contains(active) !== true) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || root.contains(active) !== true) {
      event.preventDefault();
      first.focus();
    }
  }

  // @ds guardrail: do-not-edit — Underlay presses dismiss only when the reader is dismissable; inbound images mirror the react-aria isDismissable contract.
  function onOverlayPointer(event: MouseEvent): void {
    if (inbound === null && event.target === event.currentTarget) {
      onClose('escape');
    }
  }

  function setBoundedImageZoom(next: number): void {
    const bounded = Math.min(IMAGE_MAX_ZOOM, Math.max(IMAGE_MIN_ZOOM, next));
    imageZoom = bounded;
    if (bounded === IMAGE_MIN_ZOOM) imagePan = { x: 0, y: 0 };
  }
  function panImage(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (imageZoom <= IMAGE_MIN_ZOOM) return;
    const delta = 48;
    imagePan = {
      x: imagePan.x + (direction === 'left' ? -delta : direction === 'right' ? delta : 0),
      y: imagePan.y + (direction === 'up' ? -delta : direction === 'down' ? delta : 0),
    };
  }

  const kind = $derived(
    inbound !== null
      ? 'image'
      : (inMemory?.renderer ?? (descriptor === null ? 'diff' : descriptorKind(descriptor))),
  );
  const subject = $derived(
    inMemory?.displayName ??
      inbound?.displayName ??
      (descriptor === null ? 'Redacted file diff' : descriptorSubject(descriptor)),
  );
  const title = $derived(
    inMemory?.displayName ??
      inbound?.displayName ??
      (descriptor === null ? 'File diff' : descriptorSubject(descriptor)),
  );
  const resourceStatus = $derived(resourceBlock === null ? null : resourceSnapshot.status);
  const currentStatus = $derived(
    resourceBlock === null
      ? null
      : inbound !== null || isReadyDescriptor(descriptor as FilePreviewBlock)
        ? (rendererStatus ?? resourceSnapshot.status)
        : null,
  );
  const binaryPreviewReady = $derived(
    descriptor !== null &&
      (descriptor.renderer === 'image' || descriptor.renderer === 'pdf') &&
      resourceSnapshot.status === 'ready' &&
      rendererStatus === 'ready',
  );
  const imageObjectUrl = $derived(resourceSnapshot.objectUrl ?? thumbnailSnapshot.objectUrl);
  const imageIsFull = $derived(resourceSnapshot.objectUrl !== null);
  const imageState = $derived<'loading' | 'ready' | 'full-degraded'>(
    imageIsFull
      ? 'ready'
      : thumbnailSnapshot.objectUrl !== null &&
          (resourceSnapshot.status === 'stalled' || isResourceError(resourceSnapshot.status))
        ? 'full-degraded'
        : 'loading',
  );
  const descriptorStatusArg = $derived(currentStatus ?? resourceSnapshot.status);
  const descriptorResourceReady = $derived(
    descriptor !== null &&
      resourceSnapshot.status === 'ready' &&
      (descriptor.renderer !== 'image' || resourceSnapshot.objectUrl !== null),
  );
  const descriptorImageAlt = $derived(descriptor?.altText ?? 'Sanitized image preview');
  const displayedBuffer = $derived(
    inMemory !== null
      ? inMemory.text
      : inbound !== null || descriptor === null
        ? (legacyDiff?.patch ?? null)
        : resourceSnapshot.buffer,
  );
  const shareInput = $derived<DisplayedArtifactShareInput>({
    displayName: title,
    renderer: inMemory?.renderer ?? descriptor?.renderer ?? 'diff',
    displayedBuffer: displayedBuffer ?? '',
    shareAllowed: inMemory === null ? (descriptor?.shareAllowed ?? false) : false,
    redaction: inMemory !== null ? 'applied' : (descriptor?.redaction ?? 'not-needed'),
    completeness: descriptor?.completeness ?? 'complete',
    ...(binaryPreviewReady && descriptor !== null && resourceSnapshot.bytes !== null
      ? { displayedBytes: resourceSnapshot.bytes, mimeType: descriptor.mimeType }
      : {}),
  });
  const displayedBytes = $derived(binaryPreviewReady ? resourceSnapshot.bytes : null);
  const canCopy = $derived(inbound === null && displayedBuffer !== null && canCopyDisplayedArtifact());
  const canShare = $derived(
    inbound === null &&
      (displayedBuffer !== null || displayedBytes !== null) &&
      canShareDisplayedArtifact(shareInput),
  );
  const terminal = $derived(
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
                : null,
  );
  const statusAnnouncement = $derived(
    announcement ??
      (inbound !== null
        ? null
        : inMemory === null && descriptor === null && legacyDiff === null
          ? 'The preview source could not be verified.'
          : descriptor !== null &&
              (!isReadyDescriptor(descriptor) || descriptorKind(descriptor) === null)
            ? unavailableMessage(descriptor)
            : null),
  );
  const statusPhase = $derived<ArtifactViewerPhase>(
    phase === 'opening' && inbound === null ? 'ready-diff' : phase,
  );
  const status = $derived(phase === 'opening' && inbound === null ? null : currentStatus);
  const viewerState = $derived<ArtifactViewerPhase>(
    phase === 'privacy-covered' || phase === 'closing'
      ? 'privacy-covered'
      : inbound === null
        ? phase
        : resourceSnapshot.status === 'stalled'
          ? 'stalled'
          : resourceSnapshot.offlineLoaded === true
            ? 'offline-loaded'
            : resourceSnapshot.status === 'offline'
              ? 'offline-unavailable'
              : resourceSnapshot.status === 'stale'
                ? 'stale'
                : resourceSnapshot.status === 'revoked'
                  ? 'revoked'
                  : resourceSnapshot.status === 'aborted'
                    ? 'aborted'
                    : resourceSnapshot.objectUrl !== null
                      ? 'viewer-ready'
                      : thumbnailSnapshot.objectUrl !== null &&
                          isResourceError(resourceSnapshot.status)
                        ? 'full-degraded'
                        : 'full-fetching',
  );
  const kindLabel = $derived(
    inMemory !== null
      ? `Redacted ${kind ?? 'artifact'}`
      : inbound !== null
        ? 'Redacted image'
        : descriptor === null
          ? 'Redacted artifact'
          : `Redacted ${kind ?? 'artifact'}`,
  );
  const headerRevision = $derived(
    inbound?.artifact.revision ??
      descriptor?.revision ??
      (inMemory?.revision === undefined ? null : String(inMemory.revision)),
  );
  const imageDetails = $derived<ArtifactDetailsModel | null>(
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
        },
  );

  const onCopy = (): void => {
    if (displayedBuffer === null) return;
    void copyDisplayedArtifact(displayedBuffer).then((copied) => {
      if (!copied) {
        announcement = 'Copy was unavailable.';
        return;
      }
      copyLabel = 'Copied';
      announcement = 'Displayed preview copied.';
      window.setTimeout(() => {
        copyLabel = 'Copy';
      }, 1_500);
    });
  };
  const onShare = (): void => {
    void shareDisplayedArtifact(shareInput).then((result) => {
      if (result === 'shared') announcement = 'Displayed preview shared.';
      else if (result === 'cancelled') announcement = 'Share cancelled.';
      else if (result === 'failed') announcement = 'Share failed.';
    });
  };
</script>

<!-- @ds state: the viewer phase (closed · opening · ready-diff · ready-image · viewer-ready ·
     full-fetching · stalled · offline-* · stale · revoked · privacy-covered · exiting ·
     aborted) drives [data-artifact-state] on the overlay and the preview body below.
     @ds guardrail: do-not-edit — Overlay nesting, focus trapping, Escape and underlay dismissal, edge-back handlers, and ARIA attributes are frozen. -->
{#if preview !== null && phase !== 'closed'}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="artifact-viewer-overlay"
    data-artifact-state={viewerState}
    data-privacy-covered={viewerState === 'privacy-covered' ? 'true' : undefined}
    onclick={onOverlayPointer}
  >
    <div class="artifact-viewer-modal">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="artifact-viewer-dialog"
        role="dialog"
        tabindex="-1"
        aria-label={inbound !== null
          ? 'Image preview viewer'
          : `${title === 'File diff' ? 'File diff' : 'File preview'} viewer`}
        aria-describedby="artifact-viewer-summary"
        bind:this={dialogEl}
        onkeydown={onDialogKeydown}
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        ontouchstart={onTouchStart}
        ontouchend={onTouchEnd}
      >
        <ArtifactHeader
          bind:headingRef
          {title}
          {kindLabel}
          revision={headerRevision}
          onClose={() => onClose('close')}
        />
        <ArtifactStatus
          phase={statusPhase}
          {status}
          {subject}
          announcement={statusAnnouncement}
          terminalMessage={terminal}
        />
        <div class="artifact-viewer-content">
          <p id="artifact-viewer-summary" class="artifact-viewer-summary" dir="auto">{#if inMemory !== null}{inMemory.summary}{:else if inbound !== null}{`${inbound.artifact.full.mediaType} · ${inbound.artifact.full.width} × ${inbound.artifact.full.height} · Redacted`}{:else if descriptor === null}{legacyDiff?.summary ?? 'Unverified preview source'}{:else}{`${descriptor.mimeType} · ${descriptor.completeness === 'excerpt' ? 'Excerpt' : 'Complete'} · ${descriptor.redaction === 'applied' ? 'Redacted' : 'Relay-sanitized'}`}{/if}</p>
          <PreviewControls
            kind={kind === 'pdf' ? 'text' : (kind ?? 'text')}
            {wrap}
            {findTerm}
            {...(kind === 'text' || kind === 'code' || kind === 'diff'
              ? { onWrapChange: setWrap }
              : {})}
            {...(kind === 'text' || kind === 'code' || kind === 'diff' || kind === 'markdown'
              ? { onFindTermChange: setFindTerm }
              : {})}
            {canCopy}
            {canShare}
            {onCopy}
            {onShare}
            {copyLabel}
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
                        onDetails: () => {
                          detailsOpen = !detailsOpen;
                        },
                        detailsOpen,
                      }),
                }
              : {})}
          />
          {#if imageDetails !== null}
            <ArtifactDetails model={imageDetails} open={detailsOpen} />
          {/if}
          {#if descriptor !== null && resourceSnapshot.status === 'stale'}
            <button
              type="button"
              class="artifact-stale-action"
              onclick={() => {
                announcement = 'Requesting the same exact revision again.';
                resourceReloadFn();
              }}
            >
              View latest
            </button>
          {/if}
          <div class="artifact-preview-region">
            {#if inMemory !== null}
              {#if inMemory.renderer === 'text'}
                <TextPreview
                  text={inMemory.text}
                  {wrap}
                  {findTerm}
                  ariaLabel={`${inMemory.displayName} preview`}
                />
              {:else if inMemory.renderer === 'code'}
                <CodePreview
                  text={inMemory.text}
                  {...(inMemory.language === undefined ? {} : { language: inMemory.language })}
                  {...(inMemory.revision === undefined ? {} : { revision: inMemory.revision })}
                  {wrap}
                  {findTerm}
                  ariaLabel={`${inMemory.displayName} code preview`}
                  followTail={inMemory.live === true}
                />
              {:else if inMemory.renderer === 'diff'}
                <DiffPreview patch={inMemory.text} {wrap} {findTerm} />
              {/if}
            {:else if inbound !== null}
              {#if imageObjectUrl !== null}
                <SecureImagePreview
                  objectUrl={imageObjectUrl}
                  alt={inbound.presentation.safeAlt}
                  zoom={imageZoom}
                  pan={imagePan}
                  {imageState}
                  isFull={imageIsFull}
                  onPanChange={setImagePan}
                  onZoomChange={setBoundedImageZoom}
                  onStateChange={onRendererStatus}
                />
              {:else if resourceSnapshot.status === 'loading' || resourceSnapshot.status === 'stalled' || thumbnailSnapshot.status === 'loading' || thumbnailSnapshot.status === 'stalled'}
                <div class="artifact-loading-preview" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              {:else}
                <div role="alert">
                  <UnsupportedPreview
                    renderer="image"
                    message={errorPreviewMessage(resourceSnapshot.status)}
                  />
                </div>
              {/if}
            {:else if descriptor === null}
              {#if legacyDiff === null}
                <UnsupportedPreview message="The preview source could not be verified." />
              {:else}
                <DiffPreview patch={legacyDiff.patch} {wrap} {findTerm} />
              {/if}
            {:else if !isReadyDescriptor(descriptor)}
              <div role="alert">
                <UnsupportedPreview
                  renderer={descriptor.renderer}
                  message={unavailableMessage(descriptor)}
                />
              </div>
            {:else if descriptorKind(descriptor) === null}
              <div role="alert">
                <UnsupportedPreview
                  renderer={descriptor.renderer}
                  message={unavailableMessage(descriptor)}
                />
              </div>
            {:else if !descriptorResourceReady && (descriptorStatusArg === 'loading' || descriptorStatusArg === 'stalled' || descriptorStatusArg === 'idle')}
              <div class="artifact-loading-preview" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
            {:else if !descriptorResourceReady && isResourceError(descriptorStatusArg)}
              <div role="alert">
                <UnsupportedPreview
                  renderer={descriptor.renderer}
                  message={errorPreviewMessage(descriptorStatusArg)}
                />
              </div>
            {:else if descriptor.renderer === 'image'}
              <SecureImagePreview
                objectUrl={resourceSnapshot.objectUrl}
                alt={descriptorImageAlt}
                zoom={imageZoom}
                pan={imagePan}
                imageState="ready"
                isFull
                onPanChange={setImagePan}
                onZoomChange={setBoundedImageZoom}
                onStateChange={onRendererStatus}
              />
            {:else if descriptor.renderer === 'pdf'}
              <PdfPreview
                block={descriptor}
                bytes={resourceSnapshot.bytes}
                {findTerm}
                onFindTermChange={setFindTerm}
                onStateChange={onPdfRendererStatus}
              />
            {:else if resourceSnapshot.text === null}
              <UnsupportedPreview renderer={descriptor.renderer} />
            {:else if descriptor.mimeType === 'text/markdown' || descriptor.mimeType === 'text/x-markdown'}
              <MarkdownPreview text={resourceSnapshot.text} {findTerm} />
            {:else if descriptor.renderer === 'text'}
              <TextPreview text={resourceSnapshot.text} {wrap} {findTerm} />
            {:else if descriptor.renderer === 'code'}
              <CodePreview
                text={resourceSnapshot.text}
                {...(descriptor.language === undefined ? {} : { language: descriptor.language })}
                {wrap}
                {findTerm}
              />
            {:else if descriptor.renderer === 'diff'}
              <DiffPreview patch={resourceSnapshot.text} {wrap} {findTerm} />
            {:else}
              <UnsupportedPreview renderer={descriptor.renderer} />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- @ds surface: artifact-viewer body — the preview region, loading skeleton, and stale-revision
     action owned by the viewer host. Decomposed into this co-located CSS file; single-component. The shared dialog
     chrome (overlay/modal/dialog/content/summary, header, close) is shared with AttachmentPreviewDialog
     and stays in the global sheet (→ app.css at cutover). The stale action ships native
     :hover/:focus-visible; dark re-inks use :global(:root[data-theme='dark']). Literal hex preserved.
     Values unchanged. -->
