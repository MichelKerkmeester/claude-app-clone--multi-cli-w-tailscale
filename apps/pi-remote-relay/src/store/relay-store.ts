// ───────────────────────────────────────────────────────────────────
// MODULE: Durable Redacted Relay Store
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import {
  isInboundImageBlock,
  isEnvelope,
  isOpaqueId,
  isRedactedAttachmentBlock,
  isSessionCardDto,
  isTranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';
import Database from 'better-sqlite3';
import type {
  Envelope,
  InboundImageArtifact,
  InboundImageBlock,
  InboundImageMediaClass,
  InboundImageSource,
  InboundImageTerminalReason,
  SessionCardDto,
  SyncCursor,
  SyncMessage,
  TranscriptBlock,
  TranscriptPageDto,
} from '@pi-remote/pi-rpc-protocol';

import {
  ArtifactStore,
  type ArtifactIdentity,
  type ArtifactRange,
  type ArtifactRead,
  type PutArtifactInput,
  type StoredArtifact,
  type InboundStoredArtifact,
} from './artifact-store.js';
import { MigrationRunner } from './migrations.js';
import { isControlPlaneProjection, redactEnvelope, redactionMarkerText } from './redaction.js';
import {
  sanitizeInboundImage,
  type InboundBinarySource,
  type InboundExclusionMask,
  type InboundSecretScanner,
  type InboundSanitizationResult,
} from './artifact-sanitizer.js';
import {
  projectInboundProcessingBlock,
  projectInboundReadyBlock,
  projectInboundTerminalBlock,
} from './transcript-projector.js';

const DEFAULT_RETENTION_EVENTS = 1_000;
const MAX_RETENTION_EVENTS = 10_000;
const DEFAULT_TRANSCRIPT_PAGE_SIZE = 50;
const MAX_TRANSCRIPT_PAGE_SIZE = 100;

export interface StreamIdentity {
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly sessionId: string;
}

interface StreamRow {
  readonly currentEpoch: string;
  readonly floorSeq: number;
  readonly highSeq: number;
}

interface StoredEnvelopeRow {
  readonly envelopeJson: string;
}

interface SessionCardRow {
  readonly id: string;
  readonly status: SessionCardDto['status'];
  readonly updatedAt: string;
  readonly messageCount: number;
}

export interface RelayStoreOptions {
  readonly filename?: string;
  readonly migrationDirectory?: string;
  readonly retentionEvents?: number;
}

export interface AppendResult {
  readonly inserted: boolean;
  readonly envelope: Envelope;
}

export interface SyncPlan {
  readonly barrier: number;
  readonly messages: readonly SyncMessage[];
}

export interface InboundPublishInput {
  readonly identity: StreamIdentity;
  readonly epoch: string;
  readonly expectedTranscriptRevision: number;
  readonly blockId: string;
  readonly submissionId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly mediaClass: InboundImageMediaClass;
  readonly source: InboundImageSource;
  readonly ownerPrincipal: string;
  readonly ownerDeviceId: string;
  readonly declaredByteLength: number;
  readonly expectedDigest?: string;
  readonly claimedMediaType?: string;
  readonly body: InboundBinarySource;
  readonly scanner?: InboundSecretScanner;
  readonly exclusionMasks?: readonly InboundExclusionMask[];
  readonly quarantineRoot?: string;
  readonly now?: number;
  readonly publish?: (candidate: Envelope) => Envelope | void | Promise<Envelope | void>;
}

export type InboundPublishResult =
  | {
      readonly status: 'ready';
      readonly block: InboundImageBlock;
      readonly artifact: InboundStoredArtifact;
    }
  | { readonly status: 'withheld'; readonly block: InboundImageBlock }
  | { readonly status: 'conflict' };

interface PendingInboundEnvelope {
  readonly candidate: Envelope;
  readonly blockKey: string;
  readonly expectedBlockRevision: number;
  readonly phase: 'processing' | 'settlement';
}

interface InboundBlockState {
  readonly blockKey: string;
  readonly identity: StreamIdentity;
  readonly epoch: string;
  readonly blockId: string;
  readonly blockSeq: number;
  readonly mediaClass: InboundImageMediaClass;
  readonly source: InboundImageSource;
  readonly deadline: number;
  blockRevision: number;
  phase: 'processing' | 'settled';
}

const INBOUND_PROCESSING_DEADLINE_MS = 60_000;
const INBOUND_REDACTION: Envelope['redaction'] = {
  policyVersion: 1,
  fieldsRedacted: 0,
  reasons: [],
};

/** Persist redacted envelopes with epoch order, deduplication and retention floors. */
export class RelayStore {
  private readonly database: Database.Database;
  private readonly retentionEvents: number;
  public readonly artifactStore: ArtifactStore;
  private readonly pendingInboundEnvelopes = new Map<string, PendingInboundEnvelope>();
  private readonly inboundBlocks = new Map<string, InboundBlockState>();

  public constructor(options: RelayStoreOptions = {}) {
    this.database = new Database(options.filename ?? ':memory:');
    this.database.pragma('foreign_keys = ON');
    this.database.pragma('journal_mode = WAL');
    const migrationDirectory =
      options.migrationDirectory ?? fileURLToPath(new URL('../../migrations/', import.meta.url));
    new MigrationRunner(this.database, migrationDirectory).migrateUp();
    this.artifactStore = new ArtifactStore(this.database);
    this.retentionEvents = Math.min(
      Math.max(options.retentionEvents ?? DEFAULT_RETENTION_EVENTS, 1),
      MAX_RETENTION_EVENTS,
    );
  }

  /** Redact then commit one monotonic envelope before it can be broadcast. */
  public appendEnvelope(candidate: Envelope): AppendResult {
    if (!isEnvelope(candidate)) {
      throw new TypeError('Relay refused an invalid envelope before persistence.');
    }
    if (candidate.kind === 'transcript.block' && isInboundImageBlock(candidate.payload)) {
      return this.appendInboundEnvelope(candidate);
    }
    const envelope = redactEnvelope(candidate);
    if (envelope.kind === 'transcript.block' && !isTranscriptBlock(envelope.payload)) {
      throw new TypeError(
        `Relay refused a malformed transcript projection after redaction. ${redactionMarkerText(
          envelope.redaction,
        )}`.trim(),
      );
    }
    if (
      envelope.kind === 'transcript.block' &&
      isTranscriptBlock(envelope.payload) &&
      envelope.payload.kind === 'attachment' &&
      !isRedactedAttachmentBlock(envelope.payload)
    ) {
      throw new TypeError('Relay refused an attachment projection outside the fixed allowlist.');
    }
    if (envelope.kind === 'transcript.block' && isControlPlaneProjection(envelope.payload)) {
      // Control-plane residue is never persisted, replayed, synced or broadcast.
      return { inserted: false, envelope };
    }
    const transaction = this.database.transaction((): AppendResult => {
      const duplicate = this.findDuplicate(envelope);
      if (duplicate !== null) {
        return { inserted: false, envelope: duplicate };
      }

      const identity: StreamIdentity = envelope;
      const state = this.getStream(identity);
      if (state === null) {
        this.assertFirstSequence(envelope.seq);
        this.database
          .prepare(
            `
          INSERT INTO stream_epochs (
            host_id, workspace_ref, session_id, epoch, status, started_at
          ) VALUES (?, ?, ?, ?, 'active', ?)
        `,
          )
          .run(
            envelope.hostId,
            envelope.workspaceRef,
            envelope.sessionId,
            envelope.epoch,
            envelope.occurredAt,
          );
        this.database
          .prepare(
            `
          INSERT INTO stream_state (
            host_id, workspace_ref, session_id, current_epoch, floor_seq, high_seq
          ) VALUES (?, ?, ?, ?, 1, 0)
        `,
          )
          .run(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch);
      } else if (state.currentEpoch !== envelope.epoch) {
        this.beginNewEpoch(envelope, state);
      }

      const current = this.getRequiredStream(identity);
      const expectedSequence = current.highSeq + 1;
      if (envelope.seq !== expectedSequence) {
        throw new Error(
          `Relay expected sequence ${expectedSequence} for epoch '${envelope.epoch}', received ${envelope.seq}.`,
        );
      }

      this.database
        .prepare(
          `
        INSERT INTO envelopes (
          event_id, host_id, workspace_ref, session_id, epoch, seq,
          kind, occurred_at, envelope_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          envelope.eventId,
          envelope.hostId,
          envelope.workspaceRef,
          envelope.sessionId,
          envelope.epoch,
          envelope.seq,
          envelope.kind,
          envelope.occurredAt,
          JSON.stringify(envelope),
        );

      const floorSeq = Math.max(1, envelope.seq - this.retentionEvents + 1);
      this.database
        .prepare(
          `
        DELETE FROM envelopes
        WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
          AND epoch = ? AND seq < ?
      `,
        )
        .run(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch, floorSeq);
      this.database
        .prepare(
          `
        UPDATE stream_state
        SET floor_seq = ?, high_seq = ?
        WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
      `,
        )
        .run(floorSeq, envelope.seq, envelope.hostId, envelope.workspaceRef, envelope.sessionId);

      return { inserted: true, envelope };
    });
    return transaction();
  }

  /** Return the next valid sequence for a current or new epoch. */
  public nextSequence(identity: StreamIdentity, epoch: string): number {
    const state = this.getStream(identity);
    return state !== null && state.currentEpoch === epoch ? state.highSeq + 1 : 1;
  }

  /** Build a cursor-aware sync plan frozen at one committed high-water barrier. */
  public createSyncPlan(identity: StreamIdentity, cursor?: SyncCursor): SyncPlan {
    const state = this.getStream(identity);
    if (state === null) {
      const epoch = cursor?.epoch ?? 'epoch_unknown';
      return {
        barrier: 0,
        messages: [
          {
            kind: 'sync.gap',
            sessionId: identity.sessionId,
            epoch,
            coversThrough: 0,
            reason: 'unknown-session',
          },
        ],
      };
    }

    const snapshot = (): SyncMessage => ({
      kind: 'sync.snapshot',
      sessionId: identity.sessionId,
      epoch: state.currentEpoch,
      coversThrough: state.highSeq,
      envelopes: this.readEnvelopes(
        identity,
        state.currentEpoch,
        state.floorSeq - 1,
        state.highSeq,
      ),
    });
    if (cursor === undefined) {
      return { barrier: state.highSeq, messages: [snapshot()] };
    }

    let reason: 'retention' | 'epoch' | 'ahead' | null = null;
    if (cursor.epoch !== state.currentEpoch) {
      reason = 'epoch';
    } else if (cursor.seq < state.floorSeq - 1) {
      reason = 'retention';
    } else if (cursor.seq > state.highSeq) {
      reason = 'ahead';
    }
    if (reason !== null) {
      return {
        barrier: state.highSeq,
        messages: [
          {
            kind: 'sync.gap',
            sessionId: identity.sessionId,
            epoch: state.currentEpoch,
            coversThrough: state.highSeq,
            reason,
          },
          snapshot(),
        ],
      };
    }

    return {
      barrier: state.highSeq,
      messages: [
        {
          kind: 'sync.delta',
          sessionId: identity.sessionId,
          epoch: state.currentEpoch,
          coversThrough: state.highSeq,
          envelopes: this.readEnvelopes(identity, state.currentEpoch, cursor.seq, state.highSeq),
        },
      ],
    };
  }

  /** Insert or update an opaque session card with no path or prompt fields. */
  public upsertSession(card: SessionCardDto): void {
    if (!isSessionCardDto(card)) {
      throw new TypeError('Relay refused an invalid session card.');
    }
    this.database
      .prepare(
        `
      INSERT INTO session_catalog (id, status, updated_at, message_count)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        message_count = excluded.message_count
    `,
      )
      .run(card.id, card.status, card.updatedAt, card.messageCount);
  }

  /** List only opaque session identifiers and coarse operational metadata. */
  public listSessions(): readonly SessionCardDto[] {
    return this.database
      .prepare(
        `
      SELECT id, status, updated_at AS updatedAt, message_count AS messageCount
      FROM session_catalog
      ORDER BY updated_at DESC, id ASC
    `,
      )
      .all()
      .map((row) => row as SessionCardRow);
  }

  /** Read a bounded page of already-redacted typed transcript blocks. */
  public getTranscriptPage(
    identity: StreamIdentity,
    afterSeq = 0,
    requestedLimit = DEFAULT_TRANSCRIPT_PAGE_SIZE,
  ): TranscriptPageDto {
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_TRANSCRIPT_PAGE_SIZE);
    const state = this.getStream(identity);
    if (state === null) {
      return {
        sessionId: identity.sessionId,
        items: [],
        nextSeq: null,
        coversThrough: 0,
      };
    }
    const rows = this.database
      .prepare(
        `
      SELECT envelope_json AS envelopeJson
      FROM envelopes
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
        AND epoch = ? AND kind = 'transcript.block' AND seq > ?
      ORDER BY seq ASC
      LIMIT ?
    `,
      )
      .all(
        identity.hostId,
        identity.workspaceRef,
        identity.sessionId,
        state.currentEpoch,
        afterSeq,
        limit + 1,
      ) as StoredEnvelopeRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items: TranscriptBlock[] = [];
    const inboundPositions = new Map<string, number>();
    let lastEnvelopeSeq: number | null = null;
    for (const row of pageRows) {
      const envelope = this.parseStoredEnvelope(row.envelopeJson);
      lastEnvelopeSeq = envelope.seq;
      const payload = envelope.payload;
      if (!isTranscriptBlock(payload)) continue;
      if (isInboundImageBlock(payload)) {
        const position = inboundPositions.get(payload.id);
        if (position === undefined) {
          inboundPositions.set(payload.id, items.length);
          items.push(payload);
        } else {
          const previous = items[position];
          if (previous !== undefined && isInboundImageBlock(previous) && payload.revision > previous.revision) {
            items[position] = payload;
          }
        }
      } else {
        items.push(payload);
      }
    }
    return {
      sessionId: identity.sessionId,
      items,
      nextSeq: hasMore ? lastEnvelopeSeq : null,
      coversThrough: state.highSeq,
    };
  }

  /** Close the SQLite connection after the HTTP listener stops. */
  public close(): void {
    this.artifactStore.close();
    this.database.close();
  }

  /** Share the migrated database with tightly coupled transactional services. */
  public databaseHandle(): Database.Database {
    return this.database;
  }

  /** Store one already-sanitized immutable artifact inside the relay database boundary. */
  public putArtifact(input: PutArtifactInput): StoredArtifact {
    return this.artifactStore.putArtifact(input);
  }

  /** Read one exact artifact identity without exposing it through transcript pages. */
  public readArtifact(
    identity: ArtifactIdentity,
    range: ArtifactRange | null = null,
    now?: number,
  ): ArtifactRead | null {
    return this.artifactStore.readArtifact(identity, range, now);
  }

  public createInboundProcessingEnvelope(input: InboundPublishInput): Envelope {
    this.finalizeExpiredInboundState(input.now ?? Date.now());
    if (
      !isOpaqueId(input.identity.hostId) ||
      !isOpaqueId(input.identity.workspaceRef) ||
      !isOpaqueId(input.identity.sessionId) ||
      !isOpaqueId(input.epoch) ||
      !isOpaqueId(input.blockId) ||
      !isOpaqueId(input.submissionId) ||
      !isOpaqueId(input.runId) ||
      !isOpaqueId(input.turnId) ||
      !Number.isSafeInteger(input.expectedTranscriptRevision) ||
      input.expectedTranscriptRevision < 0
    ) {
      throw new TypeError('Inbound publication context is invalid.');
    }
    const blockKey = inboundBlockKey(input.identity, input.epoch, input.blockId);
    const existing = this.inboundBlocks.get(blockKey);
    if (existing !== undefined) {
      throw new Error('Inbound publication context is stale.');
    }
    const occurredAt = new Date(input.now ?? Date.now()).toISOString();
    const blockSeq = this.nextSequence(input.identity, input.epoch);
    const block = projectInboundProcessingBlock({
      id: input.blockId,
      revision: input.expectedTranscriptRevision + 1,
      seq: blockSeq,
      occurredAt,
      mediaClass: input.mediaClass,
      source: input.source,
    });
    const candidate = makeInboundEnvelope({
      identity: input.identity,
      epoch: input.epoch,
      seq: blockSeq,
      occurredAt,
      causedBy: input.submissionId,
      payload: block,
    });
    this.inboundBlocks.set(blockKey, {
      blockKey,
      identity: input.identity,
      epoch: input.epoch,
      blockId: input.blockId,
      blockSeq,
      mediaClass: input.mediaClass,
      source: input.source,
      deadline: (input.now ?? Date.now()) + INBOUND_PROCESSING_DEADLINE_MS,
      blockRevision: block.revision,
      phase: 'processing',
    });
    this.pendingInboundEnvelopes.set(candidate.eventId, {
      candidate,
      blockKey,
      expectedBlockRevision: block.revision,
      phase: 'processing',
    });
    return candidate;
  }

  public createInboundSettlementEnvelope(
    processing: Envelope,
    result:
      | { readonly status: 'ready'; readonly artifact: InboundStoredArtifact; readonly redaction: 'not-needed' | 'applied' }
      | { readonly status: 'withheld'; readonly reason: InboundImageTerminalReason },
  ): Envelope | null {
    if (processing.kind !== 'transcript.block' || !isInboundImageBlock(processing.payload)) return null;
    const blockKey = inboundBlockKey(
      { hostId: processing.hostId, workspaceRef: processing.workspaceRef, sessionId: processing.sessionId },
      processing.epoch,
      processing.payload.id,
    );
    const state = this.inboundBlocks.get(blockKey);
    if (state === undefined || state.phase !== 'processing' || state.blockRevision !== processing.payload.revision) {
      return null;
    }
    if (this.pendingInboundForBlock(blockKey)) return null;
    const revision = processing.payload.revision + 1;
    const context = {
      id: processing.payload.id,
      revision,
      seq: state.blockSeq,
      occurredAt: new Date().toISOString(),
      mediaClass: state.mediaClass,
      source: state.source,
    } as const;
    const block =
      result.status === 'ready'
        ? projectInboundReadyBlock(context, inboundArtifactDescriptor(result.artifact), result.redaction)
        : projectInboundTerminalBlock(context, 'withheld', result.reason);
    const candidate = makeInboundEnvelope({
      identity: state.identity,
      epoch: state.epoch,
      seq: this.nextSequence(state.identity, state.epoch),
      occurredAt: context.occurredAt,
      causedBy: processing.causedBy,
      payload: block,
    });
    this.pendingInboundEnvelopes.set(candidate.eventId, {
      candidate,
      blockKey,
      expectedBlockRevision: state.blockRevision,
      phase: 'settlement',
    });
    return candidate;
  }

  public async publishInboundImage(input: InboundPublishInput): Promise<InboundPublishResult> {
    let processing: Envelope;
    try {
      processing = this.createInboundProcessingEnvelope(input);
    } catch {
      return { status: 'conflict' };
    }
    if (!isInboundImageBlock(processing.payload)) return { status: 'conflict' };
    const publish = input.publish ?? ((candidate: Envelope) => this.appendEnvelope(candidate).envelope);
    try {
      await publish(processing);
    } catch {
      this.discardInboundProcessing(processing.eventId);
      return { status: 'conflict' };
    }
    if (!this.isEnvelopeCommitted(processing.eventId)) {
      this.discardInboundProcessing(processing.eventId);
      return { status: 'conflict' };
    }

    let stored: InboundStoredArtifact | null = null;
    try {
      const sanitized = await sanitizeInboundImage(input.body, {
        declaredByteLength: input.declaredByteLength,
        ...(input.expectedDigest === undefined ? {} : { expectedDigest: input.expectedDigest }),
        ...(input.claimedMediaType === undefined ? {} : { claimedMediaType: input.claimedMediaType }),
        quarantineRoot: input.quarantineRoot ?? this.artifactStore.quarantineRoot,
        ...(input.scanner === undefined ? {} : { scanner: input.scanner }),
        ...(input.exclusionMasks === undefined ? {} : { exclusionMasks: input.exclusionMasks }),
      });
      if (sanitized.status === 'withheld') {
        const withheldIdentity = this.artifactStore.recordInboundWithheld({
          sessionId: input.identity.sessionId,
          blockId: input.blockId,
          blockRevision: processing.payload.revision + 1,
          ownerPrincipal: input.ownerPrincipal,
          ownerDeviceId: input.ownerDeviceId,
          mediaClass: input.mediaClass,
        });
        const terminal = this.createInboundSettlementEnvelope(processing, {
          status: 'withheld',
          reason: inboundTerminalReason(sanitized),
        });
        if (terminal === null) {
          this.artifactStore.purgeInboundArtifact(withheldIdentity);
          return { status: 'conflict' };
        }
        try {
          await publish(terminal);
        } catch {
          this.discardInboundPending(terminal.eventId);
          this.artifactStore.purgeInboundArtifact(withheldIdentity);
          throw new Error('Inbound settlement was not committed.');
        }
        if (!this.isEnvelopeCommitted(terminal.eventId)) {
          this.discardInboundPending(terminal.eventId);
          this.artifactStore.purgeInboundArtifact(withheldIdentity);
          return { status: 'conflict' };
        }
        return { status: 'withheld', block: terminal.payload as InboundImageBlock };
      }
      try {
        stored = this.artifactStore.putInboundArtifact({
          sessionId: input.identity.sessionId,
          blockId: input.blockId,
          ownerPrincipal: input.ownerPrincipal,
          ownerDeviceId: input.ownerDeviceId,
          turnId: input.turnId,
          mediaClass: input.mediaClass,
          source: input.source,
          blockRevision: processing.payload.revision + 1,
          full: sanitized.full,
          thumbnail: sanitized.thumbnail,
        });
      } finally {
        sanitized.full.bytes.fill(0);
        sanitized.thumbnail.bytes.fill(0);
      }
      const settlement = this.createInboundSettlementEnvelope(processing, {
        status: 'ready',
        artifact: stored,
        redaction: sanitized.redaction,
      });
      if (settlement === null) {
        this.purgeStoredInbound(stored);
        return { status: 'conflict' };
      }
      try {
        await publish(settlement);
      } catch {
        this.discardInboundPending(settlement.eventId);
        throw new Error('Inbound settlement was not committed.');
      }
      if (!this.isEnvelopeCommitted(settlement.eventId)) {
        this.discardInboundPending(settlement.eventId);
        this.purgeStoredInbound(stored);
        return { status: 'conflict' };
      }
      return { status: 'ready', block: settlement.payload as InboundImageBlock, artifact: stored };
    } catch {
      if (stored !== null) {
        this.artifactStore.purgeInboundArtifact({
          sessionId: stored.sessionId,
          artifactId: stored.artifactId,
          revision: stored.revision,
        });
      }
      const terminal = this.createInboundSettlementEnvelope(processing, {
        status: 'withheld',
        reason: 'policy',
      });
      if (terminal === null) return { status: 'conflict' };
      try {
        await publish(terminal);
      } catch {
        this.discardInboundPending(terminal.eventId);
        return { status: 'conflict' };
      }
      return this.isEnvelopeCommitted(terminal.eventId)
        ? { status: 'withheld', block: terminal.payload as InboundImageBlock }
        : { status: 'conflict' };
    }
  }

  public async finalizeAbandonedInboundProcessing(
    publish?: (candidate: Envelope) => Envelope | void | Promise<Envelope | void>,
    now = Date.now(),
  ): Promise<number> {
    const publisher = publish ?? ((candidate: Envelope) => this.appendEnvelope(candidate).envelope);
    let finalized = 0;
    for (const state of [...this.inboundBlocks.values()]) {
      if (state.phase !== 'processing' || state.deadline > now) continue;
      const processing = this.findProcessingEnvelope(state);
      if (processing === null) continue;
      const terminal = this.createInboundSettlementEnvelope(processing, {
        status: 'withheld',
        reason: 'retention',
      });
      if (terminal === null) continue;
      try {
        await publisher(terminal);
      } catch {
        this.discardInboundPending(terminal.eventId);
        continue;
      }
      if (this.isEnvelopeCommitted(terminal.eventId)) finalized += 1;
      else this.discardInboundPending(terminal.eventId);
    }
    return finalized;
  }

  public isEnvelopeCommitted(eventId: string): boolean {
    return this.database.prepare('SELECT 1 FROM envelopes WHERE event_id = ?').get(eventId) !== undefined;
  }

  /** Report the current epoch without exposing any stored session content. */
  public currentEpoch(identity: StreamIdentity): string | null {
    return this.getStream(identity)?.currentEpoch ?? null;
  }

  private appendInboundEnvelope(candidate: Envelope): AppendResult {
    const duplicate = this.findDuplicate(candidate);
    if (duplicate !== null) return { inserted: false, envelope: duplicate };
    const pending = this.pendingInboundEnvelopes.get(candidate.eventId);
    if (pending === undefined || !sameEnvelope(candidate, pending.candidate)) {
      throw new TypeError('Relay refused an unissued inbound projection.');
    }
    const envelope: Envelope = { ...candidate, redaction: INBOUND_REDACTION };
    const state = this.inboundBlocks.get(pending.blockKey);
    if (
      state === undefined ||
      state.phase !== 'processing' ||
      state.blockRevision !== pending.expectedBlockRevision ||
      !isInboundImageBlock(envelope.payload) ||
      (pending.phase === 'processing' && envelope.payload.availability !== 'processing') ||
      (pending.phase === 'settlement' && envelope.payload.availability === 'processing')
    ) {
      this.pendingInboundEnvelopes.delete(candidate.eventId);
      if (pending.phase === 'processing') this.inboundBlocks.delete(pending.blockKey);
      return { inserted: false, envelope };
    }
    const transaction = this.database.transaction((): AppendResult => {
      const currentDuplicate = this.findDuplicate(envelope);
      if (currentDuplicate !== null) return { inserted: false, envelope: currentDuplicate };
      const stream = this.getStream(envelope);
      if (stream === null) {
        this.assertFirstSequence(envelope.seq);
        this.database
          .prepare(
            `INSERT INTO stream_epochs (
              host_id, workspace_ref, session_id, epoch, status, started_at
            ) VALUES (?, ?, ?, ?, 'active', ?)`,
          )
          .run(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch, envelope.occurredAt);
        this.database
          .prepare(
            `INSERT INTO stream_state (
              host_id, workspace_ref, session_id, current_epoch, floor_seq, high_seq
            ) VALUES (?, ?, ?, ?, 1, 0)`,
          )
          .run(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch);
      } else if (stream.currentEpoch !== envelope.epoch) {
        this.beginNewEpoch(envelope, stream);
      }
      const current = this.getRequiredStream(envelope);
      if (envelope.seq !== current.highSeq + 1) return { inserted: false, envelope };
      this.database
        .prepare(
          `INSERT INTO envelopes (
            event_id, host_id, workspace_ref, session_id, epoch, seq,
            kind, occurred_at, envelope_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          envelope.eventId,
          envelope.hostId,
          envelope.workspaceRef,
          envelope.sessionId,
          envelope.epoch,
          envelope.seq,
          envelope.kind,
          envelope.occurredAt,
          JSON.stringify(envelope),
        );
      const floorSeq = Math.max(1, envelope.seq - this.retentionEvents + 1);
      this.database
        .prepare(
          `DELETE FROM envelopes
           WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
             AND epoch = ? AND seq < ?`,
        )
        .run(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch, floorSeq);
      this.database
        .prepare(
          `UPDATE stream_state SET floor_seq = ?, high_seq = ?
           WHERE host_id = ? AND workspace_ref = ? AND session_id = ?`,
        )
        .run(floorSeq, envelope.seq, envelope.hostId, envelope.workspaceRef, envelope.sessionId);
      return { inserted: true, envelope };
    });
    const result = transaction();
    this.pendingInboundEnvelopes.delete(candidate.eventId);
    if (result.inserted) {
      if (pending.phase === 'settlement') {
        state.phase = 'settled';
        state.blockRevision = envelope.payload.revision;
      }
    } else if (pending.phase === 'processing') {
      this.inboundBlocks.delete(pending.blockKey);
    }
    return result;
  }

  private finalizeExpiredInboundState(now: number): void {
    for (const [key, state] of this.inboundBlocks) {
      if (state.phase !== 'processing' || state.deadline > now) continue;
      const pending = [...this.pendingInboundEnvelopes.values()].find((item) => item.blockKey === key);
      if (pending !== undefined && !this.isEnvelopeCommitted(pending.candidate.eventId)) {
        this.pendingInboundEnvelopes.delete(pending.candidate.eventId);
        this.inboundBlocks.delete(key);
      }
    }
  }

  private pendingInboundForBlock(blockKey: string): boolean {
    for (const pending of this.pendingInboundEnvelopes.values()) {
      if (pending.blockKey === blockKey) return true;
    }
    return false;
  }

  private discardInboundProcessing(eventId: string): void {
    const pending = this.pendingInboundEnvelopes.get(eventId);
    if (pending === undefined) return;
    this.discardInboundPending(eventId);
  }

  private discardInboundPending(eventId: string): void {
    const pending = this.pendingInboundEnvelopes.get(eventId);
    if (pending === undefined) return;
    this.pendingInboundEnvelopes.delete(eventId);
    if (pending.phase === 'processing') this.inboundBlocks.delete(pending.blockKey);
  }

  private purgeStoredInbound(artifact: InboundStoredArtifact | null): void {
    if (artifact === null) return;
    this.artifactStore.purgeInboundArtifact({
      sessionId: artifact.sessionId,
      artifactId: artifact.artifactId,
      revision: artifact.revision,
    });
  }

  private findProcessingEnvelope(state: InboundBlockState): Envelope | null {
    const row = this.database
      .prepare(
        `SELECT envelope_json AS envelopeJson FROM envelopes
         WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
           AND epoch = ? AND kind = 'transcript.block' ORDER BY seq ASC`,
      )
      .all(state.identity.hostId, state.identity.workspaceRef, state.identity.sessionId, state.epoch) as StoredEnvelopeRow[];
    for (const candidate of row) {
      const envelope = this.parseStoredEnvelope(candidate.envelopeJson);
      if (envelope.kind === 'transcript.block' && isInboundImageBlock(envelope.payload) && envelope.payload.id === state.blockId && envelope.payload.availability === 'processing') {
        return envelope;
      }
    }
    return null;
  }

  private findDuplicate(envelope: Envelope): Envelope | null {
    const byEvent = this.database
      .prepare(
        `
      SELECT envelope_json AS envelopeJson FROM envelopes WHERE event_id = ?
    `,
      )
      .get(envelope.eventId) as StoredEnvelopeRow | undefined;
    if (byEvent !== undefined) {
      return this.parseStoredEnvelope(byEvent.envelopeJson);
    }
    const bySequence = this.database
      .prepare(
        `
      SELECT envelope_json AS envelopeJson
      FROM envelopes
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
        AND epoch = ? AND seq = ?
    `,
      )
      .get(
        envelope.hostId,
        envelope.workspaceRef,
        envelope.sessionId,
        envelope.epoch,
        envelope.seq,
      ) as StoredEnvelopeRow | undefined;
    return bySequence === undefined ? null : this.parseStoredEnvelope(bySequence.envelopeJson);
  }

  private beginNewEpoch(envelope: Envelope, state: StreamRow): void {
    const priorEpoch = this.database
      .prepare(
        `
      SELECT 1 FROM stream_epochs
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ? AND epoch = ?
    `,
      )
      .get(envelope.hostId, envelope.workspaceRef, envelope.sessionId, envelope.epoch);
    if (priorEpoch !== undefined) {
      throw new Error(`Relay rejected reused or stale epoch '${envelope.epoch}'.`);
    }
    this.assertFirstSequence(envelope.seq);
    this.database
      .prepare(
        `
      UPDATE stream_epochs SET status = 'ended', ended_at = ?
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ? AND epoch = ?
    `,
      )
      .run(
        envelope.occurredAt,
        envelope.hostId,
        envelope.workspaceRef,
        envelope.sessionId,
        state.currentEpoch,
      );
    this.database
      .prepare(
        `
      INSERT INTO stream_epochs (
        host_id, workspace_ref, session_id, epoch, status, started_at
      ) VALUES (?, ?, ?, ?, 'active', ?)
    `,
      )
      .run(
        envelope.hostId,
        envelope.workspaceRef,
        envelope.sessionId,
        envelope.epoch,
        envelope.occurredAt,
      );
    this.database
      .prepare(
        `
      UPDATE stream_state
      SET current_epoch = ?, floor_seq = 1, high_seq = 0
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
    `,
      )
      .run(envelope.epoch, envelope.hostId, envelope.workspaceRef, envelope.sessionId);
  }

  private getStream(identity: StreamIdentity): StreamRow | null {
    const row = this.database
      .prepare(
        `
      SELECT current_epoch AS currentEpoch, floor_seq AS floorSeq, high_seq AS highSeq
      FROM stream_state
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
    `,
      )
      .get(identity.hostId, identity.workspaceRef, identity.sessionId) as StreamRow | undefined;
    return row ?? null;
  }

  private getRequiredStream(identity: StreamIdentity): StreamRow {
    const state = this.getStream(identity);
    if (state === null) {
      throw new Error('Relay stream state disappeared inside its transaction.');
    }
    return state;
  }

  private readEnvelopes(
    identity: StreamIdentity,
    epoch: string,
    afterSeq: number,
    throughSeq: number,
  ): readonly Envelope[] {
    return (
      this.database
        .prepare(
          `
      SELECT envelope_json AS envelopeJson
      FROM envelopes
      WHERE host_id = ? AND workspace_ref = ? AND session_id = ?
        AND epoch = ? AND seq > ? AND seq <= ?
      ORDER BY seq ASC
    `,
        )
        .all(
          identity.hostId,
          identity.workspaceRef,
          identity.sessionId,
          epoch,
          afterSeq,
          throughSeq,
        ) as StoredEnvelopeRow[]
    ).map((row) => this.parseStoredEnvelope(row.envelopeJson));
  }

  private parseStoredEnvelope(serialized: string): Envelope {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isEnvelope(parsed)) {
      throw new Error('Relay database contained an invalid envelope.');
    }
    return parsed;
  }

  private assertFirstSequence(sequence: number): void {
    if (sequence !== 1) {
      throw new Error(`A new relay epoch must begin at sequence 1, received ${sequence}.`);
    }
  }
}

function makeInboundEnvelope(input: {
  readonly identity: StreamIdentity;
  readonly epoch: string;
  readonly seq: number;
  readonly occurredAt: string;
  readonly causedBy: string | null;
  readonly payload: InboundImageBlock;
}): Envelope {
  return {
    v: 1,
    eventId: `event_${randomBytes(16).toString('hex')}`,
    kind: 'transcript.block',
    hostId: input.identity.hostId,
    workspaceRef: input.identity.workspaceRef,
    sessionId: input.identity.sessionId,
    epoch: input.epoch,
    seq: input.seq,
    occurredAt: input.occurredAt,
    causedBy: isOpaqueId(input.causedBy) ? input.causedBy : null,
    payload: input.payload,
    redaction: INBOUND_REDACTION,
    replay: { eligible: true, snapshotEligible: true },
  };
}

function inboundBlockKey(identity: StreamIdentity, epoch: string, blockId: string): string {
  return `${identity.hostId}\u0000${identity.workspaceRef}\u0000${identity.sessionId}\u0000${epoch}\u0000${blockId}`;
}

function sameEnvelope(left: Envelope, right: Envelope): boolean {
  return (
    left.eventId === right.eventId &&
    left.kind === right.kind &&
    left.hostId === right.hostId &&
    left.workspaceRef === right.workspaceRef &&
    left.sessionId === right.sessionId &&
    left.epoch === right.epoch &&
    left.seq === right.seq &&
    left.payload === right.payload
  );
}

function inboundArtifactDescriptor(artifact: InboundStoredArtifact): InboundImageArtifact {
  return {
    id: artifact.artifactId,
    revision: artifact.revision,
    expiresAt: artifact.expiresAt,
    full: artifact.full,
    thumbnail: artifact.thumbnail,
  };
}

function inboundTerminalReason(result: InboundSanitizationResult): InboundImageTerminalReason {
  if (result.status === 'ready') return 'policy';
  switch (result.reason) {
    case 'unsupported-type':
      return 'unsupported-type';
    case 'too-large':
      return 'too-large';
    case 'invalid-image':
      return 'invalid-image';
    case 'redaction-unavailable':
      return 'redaction-unavailable';
    case 'policy':
      return 'policy';
  }
}
