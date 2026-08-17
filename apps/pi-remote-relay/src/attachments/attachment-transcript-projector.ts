// ───────────────────────────────────────────────────────────────────
// MODULE: Redacted Attachment Transcript Projector
// ───────────────────────────────────────────────────────────────────

import {
  isRedactedAttachmentBlock,
  type RedactedAttachmentBlock,
  type RedactedAttachmentStatus,
} from '@pi-remote/pi-rpc-protocol';

/** The only attachment fields permitted in a durable transcript card. */
export const REDACTED_ATTACHMENT_ALLOWLIST = [
  'kind',
  'id',
  'revision',
  'seq',
  'occurredAt',
  'role',
  'mediaKind',
  'ordinal',
  'status',
  'previewRetained',
] as const;

export interface RedactedAttachmentProjectionInput {
  readonly id: string;
  readonly revision: number;
  readonly seq: number;
  readonly occurredAt: string;
  readonly ordinal: number;
  readonly status: RedactedAttachmentStatus;
}

/** Construct an attachment card from already-safe transcript identity fields. */
export function projectRedactedAttachmentBlock(
  input: RedactedAttachmentProjectionInput,
): RedactedAttachmentBlock {
  const candidate = {
    kind: 'attachment' as const,
    id: input.id,
    revision: input.revision,
    seq: input.seq,
    occurredAt: input.occurredAt,
    role: 'user' as const,
    mediaKind: 'image' as const,
    ordinal: input.ordinal,
    status: input.status,
    previewRetained: false as const,
  };
  if (!isRedactedAttachmentBlock(candidate)) {
    throw new TypeError('Invalid redacted attachment projection.');
  }
  return candidate;
}

/**
 * Project an untrusted attachment-shaped value structurally. No input field
 * outside the fixed allowlist is read into the returned card.
 */
export function allowlistRedactedAttachmentBlock(value: unknown): RedactedAttachmentBlock | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.kind !== 'attachment') return null;
  if (
    typeof source.id !== 'string' ||
    typeof source.revision !== 'number' ||
    typeof source.seq !== 'number' ||
    typeof source.occurredAt !== 'string' ||
    typeof source.ordinal !== 'number' ||
    (source.status !== 'delivered' && source.status !== 'delivery-unknown')
  ) {
    return null;
  }
  try {
    return projectRedactedAttachmentBlock({
      id: source.id,
      revision: source.revision,
      seq: source.seq,
      occurredAt: source.occurredAt,
      ordinal: source.ordinal,
      status: source.status,
    });
  } catch {
    return null;
  }
}
