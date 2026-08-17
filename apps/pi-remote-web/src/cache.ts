// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Read-Only Cache
// ───────────────────────────────────────────────────────────────────
// INVARIANT: this cache may render history but can never enable mode
// controls. It stores only session cards and transcript blocks — never
// runtime state, mode, tickets, or revisions — and the app's mode
// authority comes exclusively from a live read-only hydrate, so a cached
// Build or Plan can never be presented as current authority.

import {
  isFilePreviewBlock,
  isOpaqueId,
  isSessionCardDto,
  type FilePreviewAvailability,
  type FilePreviewBlock,
  type FilePreviewCompleteness,
  type FilePreviewRedaction,
  type FilePreviewRenderer,
  type SessionCardDto,
} from '@pi-remote/pi-rpc-protocol';

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
  readonly artifactMetadata: readonly CachedArtifactMetadata[];
  readonly savedAt: string;
}

export interface CachedArtifactMetadata {
  readonly displayName: string;
  readonly renderer: FilePreviewRenderer;
  readonly mimeType: string;
  readonly byteLength: number | null;
  readonly language: string | null;
  readonly redaction: FilePreviewRedaction;
  readonly completeness: FilePreviewCompleteness;
  readonly shareAllowed: boolean;
  readonly availability: FilePreviewAvailability | null;
}

export interface ReadOnlyCache {
  readonly sessions: readonly SessionCardDto[];
  readonly savedAt: string;
  readonly transcripts: readonly CachedTranscript[];
}

export function installCacheRevalidation(onRestore: () => void): () => void {
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onRestore();
  };
  window.addEventListener('pageshow', onPageShow);
  return () => window.removeEventListener('pageshow', onPageShow);
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
    const sanitized: ReadOnlyCache = {
      sessions: value.sessions,
      savedAt: value.savedAt,
      transcripts,
    };
    if (JSON.stringify(sanitized) !== serialized) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
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
            .filter((block) => block.kind !== 'file_preview')
            .filter((block) => !isRichBodyBlock(block))
            .filter((block) => !current.pendingPromptIds.includes(block.id))
            .slice(-MAX_BLOCKS),
          artifactMetadata: current.blocks
            .filter(isFilePreviewBlock)
            .slice(-MAX_BLOCKS)
            .map(toCachedArtifactMetadata),
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
    .map((block) => parseDisplayBlock(block, 'cache'))
    .filter(
      (block): block is DisplayTranscriptBlock =>
        block !== null && block.kind !== 'file_preview' && !isRichBodyBlock(block),
    );
  return {
    sessionId: value.sessionId,
    epoch: value.epoch,
    coversThrough: value.coversThrough,
    savedAt: value.savedAt,
    blocks,
    artifactMetadata: Array.isArray(value.artifactMetadata)
      ? value.artifactMetadata
          .map(parseCachedArtifactMetadata)
          .filter((item): item is CachedArtifactMetadata => item !== null)
          .slice(-MAX_BLOCKS)
      : [],
  };
}

function toCachedArtifactMetadata(block: FilePreviewBlock): CachedArtifactMetadata {
  return {
    displayName: block.displayName,
    renderer: block.renderer,
    mimeType: block.mimeType,
    byteLength: block.byteLength,
    language: block.language ?? null,
    redaction: block.redaction,
    completeness: block.completeness,
    shareAllowed: block.shareAllowed,
    availability: block.availability ?? null,
  };
}

function parseCachedArtifactMetadata(value: unknown): CachedArtifactMetadata | null {
  if (
    !isRecord(value) ||
    typeof value.displayName !== 'string' ||
    value.displayName.length === 0 ||
    value.displayName.length > 200 ||
    typeof value.renderer !== 'string' ||
    !['image', 'pdf', 'text', 'code', 'diff', 'unsupported'].includes(value.renderer) ||
    typeof value.mimeType !== 'string' ||
    value.mimeType.length === 0 ||
    value.mimeType.length > 127 ||
    (value.byteLength !== null &&
      (typeof value.byteLength !== 'number' ||
        !Number.isSafeInteger(value.byteLength) ||
        value.byteLength < 0 ||
        value.byteLength > 50 * 1024 * 1024)) ||
    (value.language !== null &&
      (typeof value.language !== 'string' ||
        value.language.length === 0 ||
        value.language.length > 64)) ||
    !['not-needed', 'applied', 'withheld'].includes(String(value.redaction)) ||
    !['complete', 'excerpt'].includes(String(value.completeness)) ||
    typeof value.shareAllowed !== 'boolean' ||
    (value.availability !== null &&
      !['ready', 'withheld', 'missing', 'denied', 'unsupported'].includes(
        String(value.availability),
      ))
  ) {
    return null;
  }
  return {
    displayName: value.displayName,
    renderer: value.renderer as FilePreviewRenderer,
    mimeType: value.mimeType,
    byteLength: value.byteLength,
    language: value.language,
    redaction: value.redaction as FilePreviewRedaction,
    completeness: value.completeness as FilePreviewCompleteness,
    shareAllowed: value.shareAllowed,
    availability: value.availability as FilePreviewAvailability | null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRichBodyBlock(block: DisplayTranscriptBlock): boolean {
  if (block.kind === 'text_artifact') return true;
  if (block.kind !== 'tool_call' && block.kind !== 'tool_result') return false;
  return 'callId' in block || 'shellKind' in block || 'redaction' in block;
}
