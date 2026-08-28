// ───────────────────────────────────────────────────────────────────
// MODULE: Session Card Projection Seams
// ───────────────────────────────────────────────────────────────────

// Presentation-only projections over SessionCardDto. Every function here
// is pure over immutable card fields (status, messageCount, updatedAt),
// an injected unread set, and optional host keys that are read only when
// actually present. None of them writes status, fabricates a timestamp,
// or invents a title. An absent clock must mean genuinely unknown, and a
// stale working card decays to an *unknown* presentation — a lost agent
// is unknown, never a completed one.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import { resolveAttentionBadge, type AttentionBadge } from './attention.js';
import { compactId } from './view-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. STALE-WORKING DECAY
// ───────────────────────────────────────────────────────────────────

export const WORKING_STALE_MS = 20 * 60_000;

export type StalePresentation = 'fresh' | 'stale-unknown';

/**
 * Decide how a card should look based on how long its last host update
 * has been silent. Only `running` cards decay: a session the host stopped
 * reporting is unknown, not idle — an idle look would celebrate a lost
 * agent as finished. Returns a look only; it never emits a status.
 */
export function decideStalePresentation(
  status: SessionCardDto['status'],
  updatedAt: string,
  now: number,
): StalePresentation {
  if (status !== 'running') return 'fresh';
  const elapsed = now - Date.parse(updatedAt);
  if (!Number.isFinite(elapsed)) return 'fresh';
  return elapsed >= WORKING_STALE_MS ? 'stale-unknown' : 'fresh';
}

// ───────────────────────────────────────────────────────────────────
// 3. DETERMINISTIC COLOR MARK
// ───────────────────────────────────────────────────────────────────

/**
 * Stable hue in [0, 360) derived only from the opaque id. The hash is the
 * scanning color, never a way to reconstruct or display the id.
 */
export function hueFromId(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 360;
}

// ───────────────────────────────────────────────────────────────────
// 4. OPTIONAL HOST-FIELD GATE
// ───────────────────────────────────────────────────────────────────

const EMPTY_UNREAD_IDS: ReadonlySet<string> = new Set();

/** True only when the host published the key; inherited prototype names do not count. */
export function hasHostField(card: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(card, key);
}

function ownValue(card: object, key: string): unknown {
  if (!hasHostField(card, key)) return undefined;
  return (card as Record<string, unknown>)[key];
}

function ownString(card: object, key: string): string | null {
  const value = ownValue(card, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function ownFiniteNumber(card: object, key: string): number | null {
  const value = ownValue(card, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function ownPreviewMessages(card: object): readonly string[] | null {
  if (!hasHostField(card, 'previewMessages')) return null;
  const value = ownValue(card, 'previewMessages');
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null;
  return value;
}

function hideEmptyFor(card: SessionCardDto, count: number): boolean {
  const hasResumable = hasHostField(card, 'resumable');
  const hasQueued = hasHostField(card, 'queuedMessageCount');
  if (!hasResumable && !hasQueued) return false;
  const resumable = hasResumable && ownValue(card, 'resumable') === true;
  const queued = ownFiniteNumber(card, 'queuedMessageCount') ?? 0;
  return count === 0 && !resumable && queued <= 0;
}

function hostTitle(card: SessionCardDto): { readonly title: string; readonly titleFromHost: boolean } {
  const title = ownString(card, 'title');
  if (title !== null) return { title, titleFromHost: true };
  return { title: compactId(card.id), titleFromHost: false };
}

function contextPercentFor(card: object): number | null {
  const value = ownFiniteNumber(card, 'contextPercent');
  if (value === null || value < 0 || value > 100) return null;
  return value;
}

// ───────────────────────────────────────────────────────────────────
// 5. CARD VIEW-MODEL PROJECTION
// ───────────────────────────────────────────────────────────────────

export interface CardProjection {
  readonly title: string;
  readonly titleFromHost: boolean;
  readonly messageCountLabel: string;
  /** Stable absolute reference for the datetime attribute / tap-to-inspect. */
  readonly absoluteOnTap: string;
  readonly isRestingDone: boolean;
  /** A zero-message session stays visible as a recoverable card, never hidden. */
  readonly isRecoverableEmpty: boolean;
  readonly hideEmpty: boolean;
  readonly attentionBadge: AttentionBadge | null;
  readonly lastMessagePreview: string | null;
  readonly previewMessages: readonly string[] | null;
  readonly agent: string | null;
  readonly model: string | null;
  readonly contextPercent: number | null;
  readonly activity: string | null;
  readonly tool: string | null;
  readonly prompt: string | null;
}

export function projectSessionCard(
  card: SessionCardDto,
  localUnreadIds: ReadonlySet<string> = EMPTY_UNREAD_IDS,
): CardProjection {
  const count = card.messageCount;
  const named = hostTitle(card);
  const contextPercent = contextPercentFor(card);
  const model = ownString(card, 'model');
  return {
    title: named.title,
    titleFromHost: named.titleFromHost,
    messageCountLabel: count === 0 ? 'No messages' : `${count} message${count === 1 ? '' : 's'}`,
    absoluteOnTap: card.updatedAt,
    isRestingDone: card.status === 'idle',
    isRecoverableEmpty: count === 0,
    hideEmpty: hideEmptyFor(card, count),
    attentionBadge: resolveAttentionBadge(card, localUnreadIds),
    lastMessagePreview: ownString(card, 'lastMessagePreview'),
    previewMessages: ownPreviewMessages(card),
    agent: ownString(card, 'agent'),
    // Model rides the usage payload; without a fill meter there is no chip.
    model: contextPercent === null ? null : model,
    contextPercent,
    activity: ownString(card, 'activity'),
    tool: ownString(card, 'tool'),
    prompt: ownString(card, 'prompt'),
  };
}

/** Count sessions that have an attention signal for the person, excluding live work. */
export function countAttentionSessions(
  cards: readonly SessionCardDto[],
  localUnreadIds: ReadonlySet<string> = EMPTY_UNREAD_IDS,
): number {
  let count = 0;
  for (const card of cards) {
    const badge = resolveAttentionBadge(card, localUnreadIds);
    if (badge !== null && badge.kind !== 'working') count += 1;
  }
  return count;
}

export function shouldRenderCard(card: SessionCardDto): boolean {
  return !projectSessionCard(card).hideEmpty;
}

export function hasInlineEnrichment(projection: CardProjection): boolean {
  return (
    projection.lastMessagePreview !== null ||
    projection.previewMessages !== null ||
    projection.agent !== null ||
    projection.model !== null ||
    projection.contextPercent !== null ||
    projection.activity !== null ||
    projection.tool !== null ||
    projection.prompt !== null
  );
}
