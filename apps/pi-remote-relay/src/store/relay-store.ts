// ───────────────────────────────────────────────────────────────────
// MODULE: Durable Redacted Relay Store
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { isEnvelope, isSessionCardDto, isTranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import Database from 'better-sqlite3';
import type {
  Envelope,
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
} from './artifact-store.js';
import { MigrationRunner } from './migrations.js';
import { isControlPlaneProjection, redactEnvelope, redactionMarkerText } from './redaction.js';

const DEFAULT_RETENTION_EVENTS = 1_000;
const MAX_RETENTION_EVENTS = 10_000;
const DEFAULT_TRANSCRIPT_PAGE_SIZE = 50;
const MAX_TRANSCRIPT_PAGE_SIZE = 100;

interface StreamIdentity {
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

/** Persist redacted envelopes with epoch order, deduplication and retention floors. */
export class RelayStore {
  private readonly database: Database.Database;
  private readonly retentionEvents: number;
  public readonly artifactStore: ArtifactStore;

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
    const envelope = redactEnvelope(candidate);
    if (envelope.kind === 'transcript.block' && !isTranscriptBlock(envelope.payload)) {
      throw new TypeError(
        `Relay refused a malformed transcript projection after redaction. ${redactionMarkerText(
          envelope.redaction,
        )}`.trim(),
      );
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
    const items = pageRows
      .map((row) => this.parseStoredEnvelope(row.envelopeJson).payload)
      .filter((payload): payload is TranscriptBlock => isTranscriptBlock(payload));
    const lastItem = items.at(-1);
    return {
      sessionId: identity.sessionId,
      items,
      nextSeq: hasMore && lastItem !== undefined ? lastItem.seq : null,
      coversThrough: state.highSeq,
    };
  }

  /** Close the SQLite connection after the HTTP listener stops. */
  public close(): void {
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

  /** Report the current epoch without exposing any stored session content. */
  public currentEpoch(identity: StreamIdentity): string | null {
    return this.getStream(identity)?.currentEpoch ?? null;
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
