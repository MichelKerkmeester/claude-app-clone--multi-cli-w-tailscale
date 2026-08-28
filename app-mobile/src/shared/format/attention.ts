// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Attention and Push Client
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  isAttentionItemDto,
  isAttentionResolutionDto,
  isPushPreferences,
  isPushSubscriptionInput,
  type AttentionItemDto,
  type SessionCardDto,
  type AttentionResolutionDto,
  type PushPreferences,
} from '@pi-remote/pi-rpc-protocol';

import { establishSession } from '../transport/auth.js';
import {
  applyInboxAckDoneRebroadcast,
  createInboxAckIntent,
  type InboxAckCapability,
  type InboxAckDoneRebroadcast,
  type InboxAckIntent,
} from './inbox-ack.js';

// ───────────────────────────────────────────────────────────────────
// 2. ATTENTION BADGE
// ───────────────────────────────────────────────────────────────────

export type AttentionBadgeKind = 'working' | 'permission' | 'unread' | 'done';

export interface AttentionBadge {
  readonly kind: AttentionBadgeKind;
  readonly label: string;
}

/** Resolve the one badge shown by session surfaces without reading device storage. */
export function resolveAttentionBadge(
  card: SessionCardDto,
  localUnreadIds: ReadonlySet<string>,
): AttentionBadge | null {
  if (card.status === 'running') return { kind: 'working', label: 'Working' };

  const hasAttention = Object.prototype.hasOwnProperty.call(card, 'attention');
  const attention = hasAttention ? card.attention : undefined;
  if (attention === 'blocked' || attention === 'waiting') {
    return { kind: 'permission', label: 'Permission' };
  }
  if (localUnreadIds.has(card.id)) return { kind: 'unread', label: 'Unread' };
  if (attention === 'done') return { kind: 'done', label: 'Done' };
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 3. ATTENTION INBOX VIEW
// ───────────────────────────────────────────────────────────────────

/** Keep host attention items visible unless this device has read their lookup id. */
export function visibleAttentionItems(
  items: readonly AttentionItemDto[],
  localReadIds: ReadonlySet<string>,
): readonly AttentionItemDto[] {
  return items.filter((item) => !localReadIds.has(item.lookupId));
}

/** Count the attention items still visible on this device. */
export function countAttentionItems(
  items: readonly AttentionItemDto[],
  localReadIds: ReadonlySet<string>,
): number {
  return visibleAttentionItems(items, localReadIds).length;
}

/** Create an acknowledgment intent without changing the local read overlay. */
export function createAttentionAckIntent(
  lookupId: string,
  capability: InboxAckCapability | undefined,
): InboxAckIntent | undefined {
  return createInboxAckIntent(lookupId, capability);
}

/** Apply a host acknowledgment only when its advertised capability is present. */
export function applyAttentionAckDoneRebroadcast(
  readIds: ReadonlySet<string>,
  rebroadcast: InboxAckDoneRebroadcast | undefined,
  capability: InboxAckCapability | undefined,
): Set<string> {
  return applyInboxAckDoneRebroadcast(readIds, rebroadcast, capability);
}

// ───────────────────────────────────────────────────────────────────
// 4. PUSH CONFIG TYPE
// ───────────────────────────────────────────────────────────────────

export interface PushConfig {
  readonly supported: boolean;
  readonly vapidPublicKey: string | null;
  readonly preferences: PushPreferences | null;
}

// ───────────────────────────────────────────────────────────────────
// 5. ATTENTION ENDPOINTS
// ───────────────────────────────────────────────────────────────────

export async function fetchAttention(signal?: AbortSignal): Promise<readonly AttentionItemDto[]> {
  const payload = await postJson('/api/attention', undefined, signal);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isAttentionItemDto)
  ) {
    throw new Error('Relay returned an invalid Attention Inbox.');
  }
  return payload.items;
}

export async function openAttentionHint(
  lookupId: string,
  signal?: AbortSignal,
): Promise<AttentionResolutionDto> {
  if ((await establishSession()) === null) {
    throw new Error('This device must reauthenticate before opening the hint.');
  }
  const payload = await postJson('/api/attention/open', { lookupId }, signal);
  if (!isAttentionResolutionDto(payload)) throw new Error('This attention hint is stale.');
  return payload;
}

// ───────────────────────────────────────────────────────────────────
// 6. PUSH SUBSCRIPTION LIFECYCLE
// ───────────────────────────────────────────────────────────────────

export async function fetchPushConfig(signal?: AbortSignal): Promise<PushConfig> {
  const payload = await postJson('/api/push/config', undefined, signal);
  if (
    !isRecord(payload) ||
    typeof payload.supported !== 'boolean' ||
    (payload.vapidPublicKey !== null && typeof payload.vapidPublicKey !== 'string') ||
    (payload.preferences !== null && !isPushPreferences(payload.preferences))
  ) {
    throw new Error('Relay returned invalid push configuration.');
  }
  return {
    supported: payload.supported,
    vapidPublicKey: payload.vapidPublicKey,
    preferences: payload.preferences,
  };
}

export async function subscribeToPush(publicKey: string): Promise<PushPreferences> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Web Push is not available in this browser.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: fromBase64Url(publicKey),
  });
  const input = subscription.toJSON();
  if (!isPushSubscriptionInput(input))
    throw new Error('Browser returned an invalid push subscription.');
  const payload = await postJson('/api/push/subscribe', { subscription: input });
  if (!isRecord(payload) || !isPushPreferences(payload.preferences)) {
    throw new Error('Relay rejected the push subscription.');
  }
  return payload.preferences;
}

export async function updatePushPreferences(preferences: PushPreferences): Promise<void> {
  await postJson('/api/push/preferences', { preferences });
}

export async function unsubscribeFromPush(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }
  await postJson('/api/push/unsubscribe', undefined);
}

export async function setPushForeground(foreground: boolean): Promise<void> {
  await postJson('/api/push/foreground', { foreground });
}

// ───────────────────────────────────────────────────────────────────
// 7. TRANSPORT HELPERS
// ───────────────────────────────────────────────────────────────────

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 410
        ? 'This attention hint is stale.'
        : `Relay returned HTTP ${response.status}.`,
    );
  return response.status === 204 ? null : (response.json() as Promise<unknown>);
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new Uint8Array(bytes.buffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
