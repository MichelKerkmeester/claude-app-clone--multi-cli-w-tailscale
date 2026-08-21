import {
  isOpaqueId,
  type ApprovalCardDto,
  type AttentionItemDto,
  type SessionCardDto,
} from '@pi-remote/pi-rpc-protocol';

import { fetchApprovals } from '../../relay.js';

export type ThemePreference = 'system' | 'light' | 'dark';

async function loadApprovals(
  sessions: readonly { readonly id: string }[],
  signal?: AbortSignal,
): Promise<readonly ApprovalCardDto[]> {
  const pages = await Promise.all(sessions.map((session) => fetchApprovals(session.id, signal)));
  return pages.flat().sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

function readSessionIdFromLocation(): string | null {
  const match = /^\/session\/([^/]+)$/.exec(window.location.pathname);
  if (match?.[1] === undefined) return null;
  try {
    const sessionId = decodeURIComponent(match[1]);
    return isOpaqueId(sessionId) ? sessionId : null;
  } catch {
    return null;
  }
}

function readAttentionIdFromLocation(): string | null {
  const match = /^\/attention\/([^/]+)$/.exec(window.location.pathname);
  if (match?.[1] === undefined) return null;
  try {
    const lookupId = decodeURIComponent(match[1]);
    return isOpaqueId(lookupId) ? lookupId : null;
  } catch {
    return null;
  }
}

function attentionLabel(value: AttentionItemDto['attentionClass']): string {
  return { needs_input: 'Needs input', finished: 'Finished', error: 'Error' }[value];
}

function attentionIcon(value: AttentionItemDto['attentionClass']): string {
  return { needs_input: '?', finished: '✓', error: '!' }[value];
}

function sessionStatusLabel(value: SessionCardDto['status']): string {
  return { idle: 'Settled', running: 'Working', interrupted: 'Interrupted', unknown: 'Unknown' }[
    value
  ];
}

function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('pi-remote.theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function compactId(id: string): string {
  return id.length <= 18 ? id : `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function relativeTime(value: string): string {
  const milliseconds = Date.now() - Date.parse(value);
  if (!Number.isFinite(milliseconds)) return 'unknown time';
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'The relay request failed.';
}

function countdown(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} remaining`;
}

export { loadApprovals, readSessionIdFromLocation, readAttentionIdFromLocation, attentionLabel, attentionIcon, sessionStatusLabel, readThemePreference, compactId, relativeTime, messageFrom, countdown };
