// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Read-Only Cache
// ───────────────────────────────────────────────────────────────────
// INVARIANT: this cache may render history but can never enable mode
// controls. It stores only session cards and transcript blocks — never
// runtime state, mode, tickets, or revisions — and the app's mode
// authority comes exclusively from a live read-only hydrate, so a cached
// Build or Plan can never be presented as current authority.

import { isOpaqueId, isSessionCardDto, type SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import { parseDisplayBlock, type DisplayTranscriptBlock, type TranscriptState } from './state.js';

const CACHE_KEY = 'pi-remote.read-only.v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_SESSIONS = 8;
const MAX_BLOCKS = 500;

export interface CachedTranscript {
  readonly sessionId: string;
  readonly epoch: string | null;
  readonly coversThrough: number;
  readonly blocks: readonly DisplayTranscriptBlock[];
  readonly savedAt: string;
}

export interface ReadOnlyCache {
  readonly sessions: readonly SessionCardDto[];
  readonly savedAt: string;
  readonly transcripts: readonly CachedTranscript[];
}

export function loadCache(): ReadOnlyCache | null {
  try {
    const serialized = localStorage.getItem(CACHE_KEY);
    if (serialized === null) return null;
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      typeof value.savedAt !== 'string' ||
      Date.now() - Date.parse(value.savedAt) > MAX_AGE_MS ||
      !Array.isArray(value.sessions) ||
      !value.sessions.every(isSessionCardDto) ||
      !Array.isArray(value.transcripts)
    ) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const transcripts = value.transcripts
      .map(parseCachedTranscript)
      .filter((item): item is CachedTranscript => item !== null);
    return { sessions: value.sessions, savedAt: value.savedAt, transcripts };
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function saveCache(sessions: readonly SessionCardDto[], current: TranscriptState): void {
  const previous = loadCache();
  const savedAt = new Date().toISOString();
  const transcript: CachedTranscript | null =
    current.sessionId === null || current.source !== 'relay'
      ? null
      : {
          sessionId: current.sessionId,
          epoch: current.epoch,
          coversThrough: current.coversThrough,
          blocks: current.blocks
            .filter((block) => !current.pendingPromptIds.includes(block.id))
            .slice(-MAX_BLOCKS),
          savedAt,
        };
  const transcripts =
    transcript === null
      ? (previous?.transcripts ?? [])
      : [
          transcript,
          ...(previous?.transcripts ?? []).filter(
            (item) => item.sessionId !== transcript.sessionId,
          ),
        ].slice(0, MAX_SESSIONS);
  const value: ReadOnlyCache = { sessions, savedAt, transcripts };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Storage pressure must not affect the live read-only view.
  }
}

function parseCachedTranscript(value: unknown): CachedTranscript | null {
  if (
    !isRecord(value) ||
    !isOpaqueId(value.sessionId) ||
    (value.epoch !== null && !isOpaqueId(value.epoch)) ||
    typeof value.coversThrough !== 'number' ||
    !Number.isSafeInteger(value.coversThrough) ||
    value.coversThrough < 0 ||
    typeof value.savedAt !== 'string' ||
    Number.isNaN(Date.parse(value.savedAt)) ||
    !Array.isArray(value.blocks)
  )
    return null;
  const blocks = value.blocks
    .map(parseDisplayBlock)
    .filter((block): block is DisplayTranscriptBlock => block !== null);
  return {
    sessionId: value.sessionId,
    epoch: value.epoch,
    coversThrough: value.coversThrough,
    savedAt: value.savedAt,
    blocks,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
