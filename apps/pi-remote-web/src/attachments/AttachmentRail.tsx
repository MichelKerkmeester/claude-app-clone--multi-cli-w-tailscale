// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Rail
// ───────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

import { useAttachmentDraft } from './AttachmentDraftProvider.js';
import { AttachmentTile } from './AttachmentTile.js';

export function AttachmentRail() {
  const { state, mediaAvailable, getObjectUrl, openPreview, removeAttachment } =
    useAttachmentDraft();
  const pendingRemovalRef = useRef<{ readonly index: number } | null>(null);

  useEffect(() => {
    const pending = pendingRemovalRef.current;
    if (pending === null) return;
    pendingRemovalRef.current = null;
    const next = state.items[pending.index] ?? state.items[pending.index - 1] ?? null;
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-attachment-id]'));
    const target =
      next === null ? null : buttons.find((button) => button.dataset.attachmentId === next.id);
    (target ?? document.querySelector<HTMLElement>('[data-attachment-plus]'))?.focus({
      preventScroll: true,
    });
  }, [state.items]);

  if (!mediaAvailable || state.items.length === 0) return null;

  return (
    <ol className="attachment-rail" aria-label={`Draft photos, ${state.items.length} items`}>
      {state.items.map((item, index) => (
        <li key={item.id} className="attachment-rail-item">
          <AttachmentTile
            item={item}
            previewUrl={getObjectUrl(item.id)}
            position={index + 1}
            total={state.items.length}
            onOpen={(id, trigger) => openPreview(id, trigger)}
            onRemove={(id) => {
              pendingRemovalRef.current = { index };
              removeAttachment(id);
            }}
          />
        </li>
      ))}
    </ol>
  );
}
