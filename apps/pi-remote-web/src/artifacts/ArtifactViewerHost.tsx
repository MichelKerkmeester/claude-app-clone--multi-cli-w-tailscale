import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type TouchEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';

import { useVisualViewportAnchor } from '../useVisualViewportAnchor.js';
import { ArtifactHeader, type ArtifactHeaderProps } from './ArtifactHeader.js';
import { ArtifactStatus } from './ArtifactStatus.js';
import type {
  ArtifactDismissalReason,
  ArtifactPreview,
  ArtifactViewerPhase,
} from './ArtifactViewerProvider.js';
import { DiffPreview } from './DiffPreview.js';
import { PreviewControls } from './PreviewControls.js';

export interface ArtifactViewerHostProps {
  readonly phase: ArtifactViewerPhase;
  readonly preview: ArtifactPreview | null;
  readonly onClose: (reason: ArtifactDismissalReason) => void;
}

const EDGE_BACK_START = 28;
const EDGE_BACK_DISTANCE = 64;
const EDGE_BACK_CROSS_AXIS = 96;

export function ArtifactViewerHost({ phase, preview, onClose }: ArtifactViewerHostProps) {
  useVisualViewportAnchor();
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const edgeStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);

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

  const headerProps: ArtifactHeaderProps = { headingRef, onClose: () => onClose('close') };
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
          aria-label="File diff viewer"
          className="artifact-viewer-dialog"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <ArtifactHeader {...headerProps} />
          <ArtifactStatus phase={phase} />
          <div className="artifact-viewer-content">
            <p className="artifact-viewer-summary">{preview.source.summary}</p>
            <PreviewControls kind="diff" />
            <DiffPreview patch={preview.source.patch} />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
