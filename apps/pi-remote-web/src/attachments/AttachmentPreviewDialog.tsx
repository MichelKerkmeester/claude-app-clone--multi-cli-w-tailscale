// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Preview Dialog
// ───────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

import { useVisualViewportAnchor } from '../useVisualViewportAnchor.js';
import { useAttachmentDraft } from './AttachmentDraftProvider.js';

export function AttachmentPreviewDialog() {
  const { state, mediaAvailable, getObjectUrl, closePreview, removeAttachment } =
    useAttachmentDraft();
  const item = state.items.find((candidate) => candidate.id === state.previewId) ?? null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const wasOpenRef = useRef(false);
  useVisualViewportAnchor(dialogRef);

  useEffect(() => {
    const isOpen = item !== null;
    if (isOpen && !wasOpenRef.current) {
      queueMicrotask(() => headingRef.current?.focus({ preventScroll: true }));
    }
    wasOpenRef.current = isOpen;
    if (!isOpen) setPreviewFailed(false);
  }, [item]);

  if (!mediaAvailable || item === null) return null;

  const previewUrl = getObjectUrl(item.id);
  const unavailable = item.preview === 'unavailable' || previewUrl === null || previewFailed;
  const remove = () => {
    const index = state.items.findIndex((candidate) => candidate.id === item.id);
    const nextFocusId = state.items[index + 1]?.id ?? state.items[index - 1]?.id ?? null;
    removeAttachment(item.id);
    closePreview();
    queueMicrotask(() => {
      const target =
        nextFocusId === null
          ? document.querySelector<HTMLElement>('[data-attachment-plus]')
          : Array.from(document.querySelectorAll<HTMLElement>('[data-attachment-id]')).find(
              (button) => button.dataset.attachmentId === nextFocusId,
            );
      (target ?? document.querySelector<HTMLElement>('[data-attachment-plus]'))?.focus({
        preventScroll: true,
      });
    });
  };

  return (
    <ModalOverlay
      isOpen
      isDismissable
      className="artifact-viewer-overlay attachment-preview-overlay"
      onOpenChange={(open) => {
        if (!open) closePreview();
      }}
    >
      <Modal className="artifact-viewer-modal attachment-preview-modal">
        <Dialog
          ref={dialogRef}
          aria-label="Photo preview"
          className="artifact-viewer-dialog attachment-preview-dialog"
        >
          <header className="artifact-viewer-header attachment-preview-header">
            <div className="artifact-viewer-heading-group">
              <span className="artifact-viewer-kicker">Local photo</span>
              <Heading
                ref={headingRef}
                slot="title"
                tabIndex={-1}
                className="artifact-viewer-title"
              >
                {item.label}
              </Heading>
            </div>
            <Button
              type="button"
              className="artifact-viewer-close"
              aria-label="Close preview"
              onPress={closePreview}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </header>
          <div className="artifact-viewer-content attachment-preview-content">
            <p className="artifact-viewer-summary">Local-only preview. No copy has been sent.</p>
            <div className="attachment-preview-actions" role="group" aria-label="Photo actions">
              <Button type="button" className="attachment-preview-remove" onPress={remove}>
                Remove {item.label}
              </Button>
            </div>
            <div className="attachment-preview-canvas">
              {unavailable ? (
                <p className="attachment-preview-unavailable" role="status">
                  Photo · preview unavailable
                </p>
              ) : (
                <img
                  className="attachment-preview-image"
                  src={previewUrl}
                  alt={`${item.label} preview`}
                  onError={() => setPreviewFailed(true)}
                />
              )}
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
