// ───────────────────────────────────────────────────────────────────
// MODULE: View Display Helpers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  isOpaqueId,
  type ApprovalCardDto,
  type AttentionItemDto,
  type SessionCardDto,
} from '@pi-remote/pi-rpc-protocol';

import { fetchApprovals } from '../transport/relay.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type ThemePreference = 'system' | 'light' | 'dark';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

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

/** Pure relative-time label; `now` is injected so the caller owns the clock. */
export function relativeTimeAt(value: string, now: number): string {
  const milliseconds = now - Date.parse(value);
  if (!Number.isFinite(milliseconds)) return 'unknown time';
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export type TimeBucket = 'active' | 'today' | 'yesterday' | 'older';

const ACTIVE_WINDOW_MS = 60 * 60_000;

function sameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

/**
 * Bucket a host clock into Active / Today / Yesterday / Older. An unparseable
 * timestamp sinks to Older so the helper never invents recency.
 */
export function timeBucket(updatedAt: string, now: number): TimeBucket {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return 'older';
  const elapsed = now - updated.getTime();
  if (elapsed < ACTIVE_WINDOW_MS) return 'active';
  const nowDate = new Date(now);
  if (sameUtcDay(updated, nowDate)) return 'today';
  const yesterday = new Date(nowDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return sameUtcDay(updated, yesterday) ? 'yesterday' : 'older';
}

/**
 * Absolute inspect string for tap-to-reveal. Unparseable clocks stay
 * visibly unknown rather than becoming a fabricated wall time.
 */
export function absoluteTimeLabel(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'unknown time';
  return new Date(parsed).toISOString();
}

/** Legacy clock-reading wrapper kept for existing call sites. */
function relativeTime(value: string): string {
  return relativeTimeAt(value, Date.now());
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'The relay request failed.';
}

function countdown(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} remaining`;
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

export { loadApprovals, readSessionIdFromLocation, readAttentionIdFromLocation, attentionLabel, attentionIcon, sessionStatusLabel, readThemePreference, compactId, relativeTime, messageFrom, countdown };
