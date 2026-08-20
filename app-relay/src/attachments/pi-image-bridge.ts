// ───────────────────────────────────────────────────────────────────
// MODULE: Normalized Image Host-to-Pi Bridge
// ───────────────────────────────────────────────────────────────────

import {
  isPiRpcCommand,
  type MediaOutputMimeType,
  type NormalizedPiImage,
  type PiRpcCommand,
  type PromptSubmitCommand,
  type RedactedAttachmentStatus,
  type RuntimeSnapshotDto,
} from '@pi-remote/pi-rpc-protocol';

import type {
  AttachmentOwner,
  AttachmentPartRecord,
  AttachmentReservationRecord,
  AttachmentStatusDto,
} from './attachment-types.js';

const MAX_IMAGES = 4;
const MAX_NORMALIZED_BYTES_PER_IMAGE = 2 * 1024 * 1024;
const MAX_NORMALIZED_BYTES_PER_TURN = 8 * 1024 * 1024;

export type PiImageBridgeRejection =
  | 'invalid-reference'
  | 'ownership'
  | 'not-ready'
  | 'expired'
  | 'image-input-unavailable'
  | 'plan-invalid'
  | 'revision-mismatch'
  | 'replayed'
  | 'rejected';

export class PiImageBridgeError extends Error {
  public constructor(readonly code: PiImageBridgeRejection) {
    super(code);
    this.name = 'PiImageBridgeError';
  }
}

/** Bytes returned by the private normalized-derivative capability. */
export interface NormalizedDerivative {
  readonly bytes: Uint8Array;
  readonly mimeType: MediaOutputMimeType;
}

/**
 * The bridge deliberately consumes capabilities instead of attachment
 * implementation details. A future attachment service adapter can keep its
 * paths and byte ownership private while satisfying this interface.
 */
export interface PiImageAttachmentSource {
  readonly getReservation: (setId: string) => AttachmentReservationRecord | null;
  readonly getPartRecords: (setId: string) => readonly AttachmentPartRecord[] | null;
  readonly status: (setId: string, owner: AttachmentOwner) => AttachmentStatusDto;
  readonly loadNormalizedDerivative: (
    setId: string,
    attachmentId: string,
  ) => Promise<NormalizedDerivative | null>;
  readonly acknowledgeDelivered: (setId: string) => Promise<void>;
  readonly markDeliveryUnknown: (setId: string) => Promise<void>;
  readonly discardRejected?: (setId: string) => Promise<void>;
}

export interface PiImageBridgeOptions {
  readonly supervisor: {
    readonly send: (command: PiRpcCommand) => Promise<{
      readonly success: boolean;
      readonly command: string;
      readonly error?: string;
    }>;
  };
  readonly attachments: PiImageAttachmentSource;
  readonly getRuntimeSnapshot: () => RuntimeSnapshotDto | null | Promise<RuntimeSnapshotDto | null>;
  readonly currentPromptRevision: () => number;
  /** Host policy decides whether the current plan/mode may accept the set. */
  readonly planPolicy?: (snapshot: RuntimeSnapshotDto) => boolean | Promise<boolean>;
  readonly now?: () => Date;
}

export interface PiImageDeliveryResult {
  readonly status: RedactedAttachmentStatus;
  readonly attachmentCount: number;
}

/**
 * Final capability boundary for normalized image delivery. No caller receives
 * a Pi image or its encoded representation; this class owns the one RPC send.
 */
export class PiImageBridge {
  private readonly activeSets = new Set<string>();
  private readonly consumedSets = new Set<string>();

  public constructor(private readonly options: PiImageBridgeOptions) {}

  public async submit(
    command: PromptSubmitCommand,
    owner: AttachmentOwner,
  ): Promise<PiImageDeliveryResult> {
    const setId = command.attachmentSetId;
    const attachmentIds = command.attachmentIds;
    if (
      setId === undefined ||
      attachmentIds === undefined ||
      command.expectedPromptRevision === undefined ||
      command.command !== undefined ||
      attachmentIds.length === 0 ||
      attachmentIds.length > MAX_IMAGES ||
      new Set(attachmentIds).size !== attachmentIds.length
    ) {
      throw new PiImageBridgeError('invalid-reference');
    }
    if (this.consumedSets.has(setId) || this.activeSets.has(setId)) {
      throw new PiImageBridgeError('replayed');
    }

    this.activeSets.add(setId);
    const images: NormalizedPiImage[] = [];
    let totalBytes = 0;
    try {
      await this.assertFinalGate(command, owner, attachmentIds[0]!, 1);
      for (const [index, attachmentId] of attachmentIds.entries()) {
        // This is intentionally immediately adjacent to the derivative load:
        // a prior check is never reused across an asynchronous boundary.
        const snapshot = await this.assertFinalGate(command, owner, attachmentId, index + 1);
        const derivative = await this.options.attachments.loadNormalizedDerivative(
          setId,
          attachmentId,
        );
        if (derivative === null || derivative.bytes.byteLength === 0) {
          throw new PiImageBridgeError('not-ready');
        }
        if (
          derivative.bytes.byteLength >
            Math.min(
              snapshot.media?.policy.maxNormalizedBytesPerImage ?? 0,
              MAX_NORMALIZED_BYTES_PER_IMAGE,
            ) ||
          totalBytes + derivative.bytes.byteLength >
            Math.min(
              snapshot.media?.policy.maxNormalizedBytesPerTurn ?? 0,
              MAX_NORMALIZED_BYTES_PER_TURN,
            ) ||
          !snapshot.media?.policy.outputMimeTypes.includes(derivative.mimeType)
        ) {
          throw new PiImageBridgeError('not-ready');
        }
        totalBytes += derivative.bytes.byteLength;
        const data = Buffer.from(derivative.bytes).toString('base64');
        images.push({ type: 'image', mimeType: derivative.mimeType, data });
        derivative.bytes.fill(0);
      }

      const rpcCommand: PiRpcCommand = {
        id: command.submissionId,
        type: 'prompt',
        message: command.message,
        images: [...images],
        ...(command.streamingBehavior === undefined
          ? {}
          : { streamingBehavior: command.streamingBehavior }),
      };
      if (!isPiRpcCommand(rpcCommand)) {
        throw new PiImageBridgeError('not-ready');
      }

      let response: {
        readonly success: boolean;
        readonly command: string;
        readonly error?: string;
      };
      try {
        response = await this.options.supervisor.send(rpcCommand);
      } catch {
        this.consumedSets.add(setId);
        await this.markUnknown(setId);
        return { status: 'delivery-unknown', attachmentCount: attachmentIds.length };
      }
      if (!response.success || response.command !== 'prompt') {
        try {
          await this.options.attachments.discardRejected?.(setId);
        } catch {
          this.consumedSets.add(setId);
          await this.markUnknown(setId);
          return { status: 'delivery-unknown', attachmentCount: attachmentIds.length };
        }
        throw new PiImageBridgeError('rejected');
      }

      this.consumedSets.add(setId);
      try {
        await this.options.attachments.acknowledgeDelivered(setId);
        return { status: 'delivered', attachmentCount: attachmentIds.length };
      } catch {
        await this.markUnknown(setId);
        return { status: 'delivery-unknown', attachmentCount: attachmentIds.length };
      }
    } finally {
      images.length = 0;
      this.activeSets.delete(setId);
    }
  }

  private async assertFinalGate(
    command: PromptSubmitCommand,
    owner: AttachmentOwner,
    attachmentId: string,
    expectedOrdinal: number,
  ): Promise<RuntimeSnapshotDto> {
    if (
      command.expectedPromptRevision === undefined ||
      this.options.currentPromptRevision() !== command.expectedPromptRevision
    ) {
      throw new PiImageBridgeError('revision-mismatch');
    }
    const snapshot = await this.options.getRuntimeSnapshot();
    if (
      snapshot === null ||
      snapshot.sessionId !== command.sessionId ||
      snapshot.media?.enabled !== true ||
      snapshot.media.imageIn !== true
    ) {
      throw new PiImageBridgeError('image-input-unavailable');
    }
    if (this.options.planPolicy === undefined || !(await this.options.planPolicy(snapshot))) {
      throw new PiImageBridgeError('plan-invalid');
    }
    if (snapshot.media.policy.maxImagesPerTurn < expectedOrdinal) {
      throw new PiImageBridgeError('not-ready');
    }

    const setId = command.attachmentSetId;
    const attachmentIds = command.attachmentIds;
    if (
      setId === undefined ||
      attachmentIds === undefined ||
      attachmentIds[expectedOrdinal - 1] !== attachmentId
    ) {
      throw new PiImageBridgeError('invalid-reference');
    }
    const reservation = this.options.attachments.getReservation(setId);
    if (reservation === null || !sameOwner(reservation.owner, owner)) {
      throw new PiImageBridgeError('ownership');
    }
    if (
      reservation.binding.sessionId !== command.sessionId ||
      reservation.binding.sessionEpoch !== owner.sessionEpoch ||
      reservation.binding.expectedPromptRevision !== command.expectedPromptRevision ||
      reservation.binding.submissionId !== command.submissionId ||
      reservation.manifest.sessionId !== command.sessionId ||
      reservation.manifest.submissionId !== command.submissionId
    ) {
      throw new PiImageBridgeError('invalid-reference');
    }
    if (reservation.expiresAt <= (this.options.now?.() ?? new Date()).getTime()) {
      throw new PiImageBridgeError('expired');
    }

    const status = this.options.attachments.status(setId, owner);
    const statusExpiresAt = Date.parse(status.expiresAt);
    if (
      status.status !== 'ready' ||
      status.revision !== command.expectedPromptRevision ||
      !Number.isFinite(statusExpiresAt) ||
      statusExpiresAt <= (this.options.now?.() ?? new Date()).getTime()
    ) {
      throw new PiImageBridgeError(status.status === 'delivery-unknown' ? 'replayed' : 'not-ready');
    }
    const parts = this.options.attachments.getPartRecords(setId);
    if (parts === null || parts.length !== attachmentIds.length) {
      throw new PiImageBridgeError('invalid-reference');
    }
    const part = parts.find((candidate) => candidate.attachmentId === attachmentId);
    const statusPart = status.parts.find((candidate) => candidate.attachmentId === attachmentId);
    if (
      part === undefined ||
      statusPart === undefined ||
      part.setId !== setId ||
      statusPart.attachmentSetId !== setId ||
      part.item.ordinal !== expectedOrdinal ||
      statusPart.ordinal !== expectedOrdinal ||
      statusPart.partId !== part.partId ||
      statusPart.status !== 'ready'
    ) {
      throw new PiImageBridgeError('not-ready');
    }
    return snapshot;
  }

  private async markUnknown(setId: string): Promise<void> {
    await this.options.attachments.markDeliveryUnknown(setId).catch(() => undefined);
  }
}

function sameOwner(left: AttachmentOwner, right: AttachmentOwner): boolean {
  return (
    left.sessionToken === right.sessionToken &&
    left.sessionId === right.sessionId &&
    left.sessionEpoch === right.sessionEpoch &&
    left.deviceId === right.deviceId &&
    left.principal === right.principal &&
    left.origin === right.origin
  );
}
