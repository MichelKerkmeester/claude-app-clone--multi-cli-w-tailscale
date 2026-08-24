// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Attention and Web Push Service
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';

import {
  isAttentionChangedPayload,
  isPushPreferences,
  isPushSubscriptionInput,
  isTodoProjectionEnvelopeKind,
  type AttentionChangedPayload,
  type AttentionClass,
  type AttentionItemDto,
  type AttentionResolutionDto,
  type Envelope,
  type PushHintPayload,
  type PushPreferences,
  type PushSubscriptionInput,
} from '@pi-remote/pi-rpc-protocol';
import type Database from 'better-sqlite3';
import webpush from 'web-push';

import type { RelayStore } from '../store/relay-store.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: PushPreferences = {
  needs_input: true,
  finished: true,
  error: true,
};
const MAX_ATTENTION_ITEMS = 200;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface SubscriptionRow {
  readonly deviceId: string;
  readonly subscriptionCiphertext: string;
  readonly subscriptionIv: string;
  readonly preferencesJson: string;
}

interface AttentionRow {
  readonly lookupId: string;
  readonly attentionClass: AttentionClass;
  readonly generation: number;
  readonly nonce: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly target: 'session' | 'review';
  readonly focusId: string | null;
  readonly occurredAt: string;
}

interface PushSender {
  sendNotification(subscription: PushSubscriptionInput, payload: string): Promise<unknown>;
}

export interface PushServiceOptions {
  readonly store: RelayStore;
  readonly encryptionKey: Uint8Array;
  readonly sender?: PushSender;
  readonly vapid?: {
    readonly subject: string;
    readonly publicKey: string;
    readonly privateKey: string;
  };
  readonly now?: () => number;
}

export interface PublishContext {
  readonly committed: boolean;
  readonly foregroundDeviceIds?: ReadonlySet<string>;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Persist bounded attention metadata and deliver content-free Web Push hints. */
export class PushService {
  private readonly database: Database.Database;
  private readonly key: Buffer;
  private readonly sender: PushSender;
  private readonly now: () => number;
  private readonly assertedForegroundDevices = new Set<string>();
  public readonly vapidPublicKey: string | null;

  public constructor(private readonly options: PushServiceOptions) {
    if (options.encryptionKey.byteLength !== 32) {
      throw new Error('Push subscription encryption requires exactly 32 bytes.');
    }
    this.database = options.store.databaseHandle();
    this.key = Buffer.from(options.encryptionKey);
    this.now = options.now ?? Date.now;
    this.vapidPublicKey = options.vapid?.publicKey ?? null;
    if (options.sender !== undefined) {
      this.sender = options.sender;
    } else {
      if (options.vapid === undefined) throw new Error('VAPID configuration is required.');
      webpush.setVapidDetails(
        options.vapid.subject,
        options.vapid.publicKey,
        options.vapid.privateKey,
      );
      this.sender = {
        sendNotification: (subscription, payload) =>
          webpush.sendNotification(subscription, payload),
      };
    }
  }

  public subscribe(deviceId: string, subscription: PushSubscriptionInput): void {
    if (!isPushSubscriptionInput(subscription)) throw new TypeError('Invalid push subscription.');
    const encrypted = this.encrypt(JSON.stringify(subscription));
    const now = new Date(this.now()).toISOString();
    this.database
      .prepare(
        `
      INSERT INTO push_subscriptions (
        device_id, subscription_ciphertext, subscription_iv,
        preferences_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        subscription_ciphertext = excluded.subscription_ciphertext,
        subscription_iv = excluded.subscription_iv,
        updated_at = excluded.updated_at
    `,
      )
      .run(
        deviceId,
        encrypted.ciphertext,
        encrypted.iv,
        JSON.stringify(DEFAULT_PREFERENCES),
        now,
        now,
      );
  }

  public preferences(deviceId: string): PushPreferences {
    const row = this.readSubscription(deviceId);
    return row === null ? DEFAULT_PREFERENCES : this.parsePreferences(row.preferencesJson);
  }

  public setPreferences(deviceId: string, preferences: PushPreferences): boolean {
    if (!isPushPreferences(preferences)) throw new TypeError('Invalid push preferences.');
    return (
      this.database
        .prepare(
          `
      UPDATE push_subscriptions SET preferences_json = ?, updated_at = ? WHERE device_id = ?
    `,
        )
        .run(JSON.stringify(preferences), new Date(this.now()).toISOString(), deviceId).changes > 0
    );
  }

  public unsubscribe(deviceId: string): boolean {
    this.assertedForegroundDevices.delete(deviceId);
    return (
      this.database.prepare('DELETE FROM push_subscriptions WHERE device_id = ?').run(deviceId)
        .changes > 0
    );
  }

  public setForeground(deviceId: string, foreground: boolean): void {
    if (foreground) this.assertedForegroundDevices.add(deviceId);
    else this.assertedForegroundDevices.delete(deviceId);
  }

  public listAttention(): readonly AttentionItemDto[] {
    return (
      this.database
        .prepare(
          `
      SELECT lookup_id AS lookupId, attention_class AS attentionClass,
        generation, nonce, occurred_at AS occurredAt
      FROM attention_items ORDER BY occurred_at DESC LIMIT ?
    `,
        )
        .all(MAX_ATTENTION_ITEMS) as AttentionRow[]
    ).map(toItem);
  }

  public resolve(
    lookupId: string,
    identity: { readonly hostId: string; readonly workspaceRef: string } = {
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
    },
  ): AttentionResolutionDto | null {
    const row = this.database
      .prepare(
        `
      SELECT lookup_id AS lookupId, attention_class AS attentionClass,
        generation, nonce, session_id AS sessionId, epoch, target,
        focus_id AS focusId,
        occurred_at AS occurredAt
      FROM attention_items WHERE lookup_id = ?
    `,
      )
      .get(lookupId) as AttentionRow | undefined;
    if (
      row === undefined ||
      row.epoch !==
        this.options.store.currentEpoch({
          hostId: identity.hostId,
          workspaceRef: identity.workspaceRef,
          sessionId: row.sessionId,
        })
    )
      return null;
    return {
      item: toItem(row),
      sessionId: row.sessionId,
      epoch: row.epoch,
      target: row.target,
      focusId: row.focusId,
    };
  }

  public async publish(envelope: Envelope, context: PublishContext): Promise<number> {
    if (!context.committed) return 0;
    if (isTodoProjectionEnvelopeKind(envelope.kind)) {
      return this.sendHint(serializeTodoProjectionPushHint(), context);
    }
    if (envelope.kind !== 'attention.changed' || !isAttentionChangedPayload(envelope.payload)) {
      return 0;
    }
    const payload = envelope.payload;
    const latest = this.database
      .prepare(
        `
      SELECT MAX(generation) AS generation FROM attention_items
      WHERE session_id = ? AND epoch = ?
    `,
      )
      .get(envelope.sessionId, envelope.epoch) as { generation: number | null };
    if (latest.generation !== null && payload.generation <= latest.generation) return 0;
    const target = payload.attentionClass === 'needs_input' ? 'review' : 'session';
    const inserted =
      this.database
        .prepare(
          `
      INSERT OR IGNORE INTO attention_items (
        lookup_id, attention_class, generation, nonce,
        session_id, epoch, target, focus_id, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        )
        .run(
          payload.lookupId,
          payload.attentionClass,
          payload.generation,
          payload.nonce,
          envelope.sessionId,
          envelope.epoch,
          target,
          envelope.causedBy,
          envelope.occurredAt,
        ).changes > 0;
    if (!inserted) return 0;
    this.trimAttention();

    const hint = serializePushHint(payload);
    return this.sendHint(hint, context, payload.attentionClass);
  }

  public sendContentFreeHint(hint: string, context: PublishContext): Promise<number> {
    return this.sendHint(hint, context);
  }

  private async sendHint(
    hint: string,
    context: PublishContext,
    attentionClass?: AttentionClass,
  ): Promise<number> {
    const rows = this.database
      .prepare(
        `
      SELECT device_id AS deviceId, subscription_ciphertext AS subscriptionCiphertext,
        subscription_iv AS subscriptionIv, preferences_json AS preferencesJson
      FROM push_subscriptions
    `,
      )
      .all() as SubscriptionRow[];
    let sent = 0;
    // A client assertion can go stale and strand a device; observed socket state is
    // the foreground state the server can actually see whenever it is available.
    const foregroundDeviceIds =
      context.foregroundDeviceIds ?? this.assertedForegroundDevices;
    await Promise.all(
      rows.map(async (row) => {
        const preferences = this.parsePreferences(row.preferencesJson);
        const enabled =
          attentionClass === undefined
            ? Object.values(preferences).some(Boolean)
            : preferences[attentionClass];
        if (
          foregroundDeviceIds.has(row.deviceId) ||
          !enabled
        ) {
          return;
        }
        try {
          await this.sender.sendNotification(this.decryptSubscription(row), hint);
          sent += 1;
        } catch (error: unknown) {
          if (isInvalidEndpoint(error)) this.unsubscribe(row.deviceId);
        }
      }),
    );
    return sent;
  }

  private readSubscription(deviceId: string): SubscriptionRow | null {
    const row = this.database
      .prepare(
        `
      SELECT device_id AS deviceId, subscription_ciphertext AS subscriptionCiphertext,
        subscription_iv AS subscriptionIv, preferences_json AS preferencesJson
      FROM push_subscriptions WHERE device_id = ?
    `,
      )
      .get(deviceId) as SubscriptionRow | undefined;
    return row ?? null;
  }

  private encrypt(value: string): { readonly ciphertext: string; readonly iv: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64url');
    return { ciphertext, iv: iv.toString('base64url') };
  }

  private decryptSubscription(row: SubscriptionRow): PushSubscriptionInput {
    const bytes = Buffer.from(row.subscriptionCiphertext, 'base64url');
    if (bytes.length <= 16) throw new Error('Encrypted push subscription is truncated.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(row.subscriptionIv, 'base64url'),
    );
    decipher.setAuthTag(bytes.subarray(bytes.length - 16));
    const serialized = Buffer.concat([
      decipher.update(bytes.subarray(0, bytes.length - 16)),
      decipher.final(),
    ]).toString('utf8');
    const parsed: unknown = JSON.parse(serialized);
    if (!isPushSubscriptionInput(parsed)) throw new Error('Stored push subscription is invalid.');
    return parsed;
  }

  private parsePreferences(value: string): PushPreferences {
    const parsed: unknown = JSON.parse(value);
    if (!isPushPreferences(parsed)) throw new Error('Stored push preferences are invalid.');
    return parsed;
  }

  private trimAttention(): void {
    this.database
      .prepare(
        `
      DELETE FROM attention_items WHERE lookup_id IN (
        SELECT lookup_id FROM attention_items
        ORDER BY occurred_at DESC LIMIT -1 OFFSET ?
      )
    `,
      )
      .run(MAX_ATTENTION_ITEMS);
  }
}

export function createAttentionPayload(
  attentionClass: AttentionClass,
  generation: number,
): AttentionChangedPayload {
  return {
    lookupId: `hint_${randomUUID().replaceAll('-', '_')}`,
    attentionClass,
    generation,
    nonce: `nonce_${randomBytes(12).toString('base64url')}`,
  };
}

export function serializePushHint(payload: AttentionChangedPayload): string {
  const hint: PushHintPayload = {
    lookupId: payload.lookupId,
    attentionClass: payload.attentionClass,
  };
  return JSON.stringify(hint);
}

/** Wake the app for a read-only projection refresh without carrying projection data. */
export function serializeTodoProjectionPushHint(): string {
  return serializePushHint({
    lookupId: 'todo_sync_available',
    attentionClass: 'finished',
    generation: 1,
    nonce: 'todo_sync_nonce',
  });
}

export const serializeTodoSyncAvailability = serializeTodoProjectionPushHint;

export const serializeTodoProjectionHint = serializeTodoProjectionPushHint;

// Push delivery is deliberately separated from attention persistence: todo data is
// already available through authenticated sync and must not enter the push database.
export async function sendContentFreePushHint(
  service: PushService,
  hint: string,
  context: PublishContext,
): Promise<number> {
  return service.sendContentFreeHint(hint, context);
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function toItem(row: AttentionRow): AttentionItemDto {
  return {
    lookupId: row.lookupId,
    attentionClass: row.attentionClass,
    generation: row.generation,
    nonce: row.nonce,
    occurredAt: row.occurredAt,
  };
}

function isInvalidEndpoint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}
