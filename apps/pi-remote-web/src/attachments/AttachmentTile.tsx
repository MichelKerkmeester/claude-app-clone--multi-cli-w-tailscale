// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Tile
// ───────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-aria-components';

import { attachmentStatusLabel, type AttachmentDraftItem } from './attachment-state.js';

export interface AttachmentTileProps {
  readonly item: AttachmentDraftItem;
  readonly previewUrl: string | null;
  readonly onOpen: (id: string, trigger: HTMLElement | null) => void;
  readonly onRemove: (id: string) => void;
  readonly position: number;
  readonly total: number;
}

export function AttachmentTile({
  item,
  previewUrl,
  onOpen,
  onRemove,
  position,
  total,
}: AttachmentTileProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setPreviewFailed(false), [previewUrl, item.preview]);

  const unavailable = item.preview === 'unavailable' || previewUrl === null || previewFailed;
  return (
    <div className="attachment-tile">
      <Button
        ref={previewButtonRef}
        type="button"
        className="attachment-tile-preview"
        data-attachment-id={item.id}
        aria-label={`Preview ${item.label}`}
        aria-posinset={position}
        aria-setsize={total}
        onPress={() => onOpen(item.id, previewButtonRef.current)}
      >
        {unavailable ? (
          <span className="attachment-tile-unavailable">Photo · preview unavailable</span>
        ) : (
          <img
            src={previewUrl}
            alt={`${item.label} preview`}
            onError={() => setPreviewFailed(true)}
          />
        )}
        <span className="attachment-tile-name">{item.label}</span>
      </Button>
      <Button
        type="button"
        className="attachment-tile-remove"
        aria-label={`Remove ${item.label}`}
        data-hit-target="44"
        onPress={() => onRemove(item.id)}
      >
        <span aria-hidden="true">×</span>
      </Button>
      <span className="attachment-tile-status" aria-live="polite">
        {attachmentStatusLabel(item)}
      </span>
    </div>
  );
}
