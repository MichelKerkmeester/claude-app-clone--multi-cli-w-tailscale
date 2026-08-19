// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Attention and Push Client
// ───────────────────────────────────────────────────────────────────

import {
  isAttentionItemDto,
  isAttentionResolutionDto,
  isPushPreferences,
  isPushSubscriptionInput,
  type AttentionItemDto,
  type AttentionResolutionDto,
  type PushPreferences,
} from '@pi-remote/pi-rpc-protocol';

import { establishSession } from './auth.js';

export interface PushConfig {
  readonly supported: boolean;
  readonly vapidPublicKey: string | null;
  readonly preferences: PushPreferences | null;
}

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
