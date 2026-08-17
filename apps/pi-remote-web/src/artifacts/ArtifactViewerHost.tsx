import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent,
} from 'react';
import {
  isFilePreviewBlock,
  type FileDiffBlock,
  type FilePreviewBlock,
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
import { ArtifactStatus } from './ArtifactStatus.js';
import type {
  ArtifactDismissalReason,
  ArtifactPreview,
  ArtifactViewerPhase,
} from './ArtifactViewerProvider.js';
import { CodePreview } from './CodePreview.js';
import { DiffPreview } from './DiffPreview.js';
import { MarkdownPreview } from './MarkdownPreview.js';
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

function isReadyDescriptor(block: FilePreviewBlock): boolean {
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

function descriptorSubject(block: FilePreviewBlock): string {
  return block.displayName.length > 0 ? block.displayName : 'redacted file';
}

function descriptorKind(block: FilePreviewBlock): 'text' | 'markdown' | 'code' | 'diff' | null {
  if (block.mimeType === 'text/markdown' || block.mimeType === 'text/x-markdown') return 'markdown';
  if (block.renderer === 'text' || block.renderer === 'code' || block.renderer === 'diff') {
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

function renderDescriptor(
  block: FilePreviewBlock,
  status: ArtifactResourceStatus,
  text: string | null,
  wrap: boolean,
  findTerm: string,
): React.ReactNode {
  if (!isReadyDescriptor(block)) {
    return <UnsupportedPreview renderer={block.renderer} message={unavailableMessage(block)} />;
  }
  if (descriptorKind(block) === null) {
    return <UnsupportedPreview renderer={block.renderer} message={unavailableMessage(block)} />;
  }
  if (status === 'loading' || status === 'stalled' || status === 'idle') {
    return (
      <div className="artifact-loading-preview" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (isResourceError(status)) {
    return <UnsupportedPreview renderer={block.renderer} message={errorPreviewMessage(status)} />;
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

export function ArtifactViewerHost({ phase, preview, onClose }: ArtifactViewerHostProps) {
  useVisualViewportAnchor();
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const edgeStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const [wrap, setWrap] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const sourceValue: unknown = preview?.source;
  const legacyDiff: FileDiffBlock | null =
    sourceValue !== undefined && isLegacyDiffSource(sourceValue) ? sourceValue : null;
  const descriptor: FilePreviewBlock | null =
    sourceValue !== undefined && isFilePreviewBlock(sourceValue) ? sourceValue : null;
  const sessionId = preview?.trigger?.dataset.artifactSessionId ?? null;
  const resourceEnabled =
    descriptor !== null &&
    isReadyDescriptor(descriptor) &&
    descriptorKind(descriptor) !== null &&
    phase !== 'exiting';
  const resource = useArtifactResource(sessionId, descriptor, { enabled: resourceEnabled });
  const resourceCloseRef = useRef(resource.close);
  resourceCloseRef.current = resource.close;

  useEffect(() => {
    if (phase === 'exiting') resourceCloseRef.current();
  }, [phase]);

  useEffect(() => {
    setWrap(false);
    setFindTerm('');
    setCopyLabel('Copy');
    setAnnouncement(null);
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
    if (preview === null || (phase !== 'opening' && phase !== 'ready-diff')) return undefined;
    const timer = window.setTimeout(() => {
      headingRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [phase, preview?.generation]);

  useEffect(() => {
    if (phase !== 'ready-diff') return undefined;
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

  const kind = descriptor === null ? 'diff' : descriptorKind(descriptor);
  const subject = descriptor === null ? 'Redacted file diff' : descriptorSubject(descriptor);
  const title = descriptor === null ? 'File diff' : descriptorSubject(descriptor);
  const resourceStatus = descriptor === null ? null : resource.status;
  const currentStatus =
    descriptor === null ? null : isReadyDescriptor(descriptor) ? resource.status : null;
  const body =
    descriptor === null ? (
      legacyDiff === null ? (
        <UnsupportedPreview message="The preview source could not be verified." />
      ) : (
        <DiffPreview patch={legacyDiff.patch} wrap={wrap} findTerm={findTerm} />
      )
    ) : (
      renderDescriptor(descriptor, resource.status, resource.text, wrap, findTerm)
    );
  const displayedBuffer = descriptor === null ? (legacyDiff?.patch ?? null) : resource.buffer;
  const shareInput: DisplayedArtifactShareInput = {
    displayName: title,
    renderer: descriptor?.renderer ?? 'diff',
    displayedBuffer: displayedBuffer ?? '',
    shareAllowed: descriptor?.shareAllowed ?? false,
    redaction: descriptor?.redaction ?? 'not-needed',
    completeness: descriptor?.completeness ?? 'complete',
  };
  const canCopy = displayedBuffer !== null && canCopyDisplayedArtifact();
  const canShare = displayedBuffer !== null && canShareDisplayedArtifact(shareInput);
  const terminal =
    legacyDiff === null && descriptor === null
      ? 'The preview source could not be verified.'
      : descriptor !== null && !isReadyDescriptor(descriptor)
        ? unavailableMessage(descriptor)
        : descriptor !== null && descriptorKind(descriptor) === null
          ? unavailableMessage(descriptor)
          : resourceStatus !== null
            ? terminalMessage(resourceStatus)
            : null;
  const statusAnnouncement =
    announcement ??
    (descriptor === null && legacyDiff === null
      ? 'The preview source could not be verified.'
      : descriptor !== null &&
          (!isReadyDescriptor(descriptor) || descriptorKind(descriptor) === null)
        ? unavailableMessage(descriptor)
        : null);
  const kindLabel = descriptor === null ? 'Redacted artifact' : `Redacted ${kind ?? 'artifact'}`;
  const headerProps: ArtifactHeaderProps = {
    headingRef,
    onClose: () => onClose('close'),
    title,
    kindLabel,
    revision: descriptor?.revision ?? null,
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

  return (
    <ModalOverlay
      isOpen
      isDismissable
      className="artifact-viewer-overlay"
      data-artifact-state={phase}
      onOpenChange={(open) => {
        if (!open) onClose('escape');
      }}
    >
      <Modal className="artifact-viewer-modal">
        <Dialog
          ref={dialogRef}
          aria-label={`${title === 'File diff' ? 'File diff' : 'File preview'} viewer`}
          className="artifact-viewer-dialog"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ArtifactHeader {...headerProps} />
          <ArtifactStatus
            phase={phase}
            status={currentStatus}
            subject={subject}
            announcement={statusAnnouncement}
            terminalMessage={terminal}
          />
          <div className="artifact-viewer-content">
            <p className="artifact-viewer-summary" dir="auto">
              {descriptor === null
                ? (legacyDiff?.summary ?? 'Unverified preview source')
                : `${descriptor.mimeType} · ${descriptor.completeness === 'excerpt' ? 'Excerpt' : 'Complete'} · ${descriptor.redaction === 'applied' ? 'Redacted' : 'Relay-sanitized'}`}
            </p>
            <PreviewControls
              kind={kind ?? 'text'}
              wrap={wrap}
              findTerm={findTerm}
              {...(kind === 'markdown' || kind === null ? {} : { onWrapChange: setWrap })}
              {...(kind === null ? {} : { onFindTermChange: setFindTerm })}
              canCopy={canCopy}
              canShare={canShare}
              onCopy={onCopy}
              onShare={onShare}
              copyLabel={copyLabel}
            />
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
