// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Display State Reducers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS AND RE-EXPORTS
// ───────────────────────────────────────────────────────────────────

import {
  isOpaqueId,
  isRedactedAttachmentBlock,
  isRichTranscriptBlock,
  isRuntimeMediaCapabilityDto,
  isTranscriptBlock,
  type Envelope,
  type FilePreviewAvailability,
  type FilePreviewBlock,
  type SessionCardDto,
  type SyncDelta,
  type SyncGap,
  type SyncSnapshot,
  type RuntimeMediaCapabilityDto,
  type RedactedAttachmentBlock,
  type TextArtifactBlock,
  type TranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';

export {
  EMPTY_TODO_PROJECTION_STATE,
  todoProjectionReducer,
  type TodoProjectionAction,
  type TodoProjectionState,
} from './todo-state.js';

// ───────────────────────────────────────────────────────────────────
// 2. MEDIA CAPABILITY
// ───────────────────────────────────────────────────────────────────

export function parseRuntimeMediaCapability(value: unknown): RuntimeMediaCapabilityDto | null {
  return isRuntimeMediaCapabilityDto(value) ? value : null;
}

export const DEFAULT_MEDIA_CAPABILITY_OFF: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> =
  {
    enabled: false,
    imageIn: false,
  };

// ───────────────────────────────────────────────────────────────────
// 3. COMPOSER KEYBOARD PREFERENCE
// ───────────────────────────────────────────────────────────────────
// Preference gates composer Shift+Tab only; it never changes host authority.

const COMPOSER_SHIFT_TAB_KEY = 'pi-remote.composer-shift-tab';

/** Default on: target-product parity, with the toggle restoring reverse focus. */
export function readComposerShiftTabPreference(): boolean {
  try {
    return window.localStorage.getItem(COMPOSER_SHIFT_TAB_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeComposerShiftTabPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(COMPOSER_SHIFT_TAB_KEY, enabled ? '1' : '0');
  } catch {
    // The preference applies for this session when storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. DEVICE-LOCAL PROMPT HISTORY
// ───────────────────────────────────────────────────────────────────
// Device-local prompt recall: newest-first, no empties, no consecutive dups.
// Storage failure degrades to empty history — no host field.

const PROMPT_HISTORY_KEY = 'pi-remote.prompt-history';
const MAX_HISTORY = 50;

/** Read stored prompt history, newest-first. Returns empty array on any failure. */
export function readPromptHistory(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(PROMPT_HISTORY_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

/**
 * Record an accepted send, skipping empties and consecutive duplicates.
 * Newest-first; storage failure degrades silently.
 */
export function recordPromptHistory(prompt: string): void {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return;
  try {
    const history = readPromptHistory();
    // Skip consecutive duplicate
    if (history.length > 0 && history[0] === trimmed) return;
    const updated = [trimmed, ...history].slice(0, MAX_HISTORY);
    window.localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Storage failure degrades gracefully; history stays as-is in memory.
  }
}

/** Clear the stored prompt history. */
export function clearPromptHistory(): void {
  try {
    window.localStorage.removeItem(PROMPT_HISTORY_KEY);
  } catch {
    // Best-effort clear.
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CONNECTION STATE
// ───────────────────────────────────────────────────────────────────

export type ConnectionPhase =
  'unenrolled' | 'authenticating' | 'offline' | 'connecting' | 'live' | 'reconnecting' | 'error';

export interface ConnectionState {
  readonly phase: ConnectionPhase;
  readonly changedAt: string;
  readonly lastMessageAt: string | null;
  readonly detail: string | null;
}

export type ConnectionAction =
  | { readonly type: 'authenticating' }
  | { readonly type: 'unenrolled' }
  | { readonly type: 'connecting'; readonly reconnect: boolean }
  | { readonly type: 'live'; readonly at: string }
  | { readonly type: 'offline' }
  | { readonly type: 'error'; readonly detail: string };

export function connectionReducer(
  state: ConnectionState,
  action: ConnectionAction,
): ConnectionState {
  const changedAt = new Date().toISOString();
  switch (action.type) {
    case 'authenticating':
      return { ...state, phase: 'authenticating', changedAt, detail: null };
    case 'unenrolled':
      return { ...state, phase: 'unenrolled', changedAt, detail: 'Device enrollment required.' };
    case 'connecting':
      return {
        ...state,
        phase: action.reconnect ? 'reconnecting' : 'connecting',
        changedAt,
        detail: null,
      };
    case 'live':
      return { phase: 'live', changedAt, lastMessageAt: action.at, detail: null };
    case 'offline':
      return { ...state, phase: 'offline', changedAt, detail: null };
    case 'error':
      return { ...state, phase: 'error', changedAt, detail: action.detail };
  }
}

// ───────────────────────────────────────────────────────────────────
// 6. SESSION LIST STATE
// ───────────────────────────────────────────────────────────────────

export interface SessionListState {
  readonly items: readonly SessionCardDto[];
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly source: 'none' | 'cache' | 'relay';
  readonly updatedAt: string | null;
  readonly error: string | null;
}

export type SessionListAction =
  | {
      readonly type: 'hydrate';
      readonly items: readonly SessionCardDto[];
      readonly savedAt: string;
    }
  | { readonly type: 'loading' }
  | { readonly type: 'loaded'; readonly items: readonly SessionCardDto[]; readonly at: string }
  | { readonly type: 'error'; readonly error: string };

export function sessionListReducer(
  state: SessionListState,
  action: SessionListAction,
): SessionListState {
  switch (action.type) {
    case 'hydrate':
      return {
        items: action.items,
        phase: 'ready',
        source: 'cache',
        updatedAt: action.savedAt,
        error: null,
      };
    case 'loading':
      return { ...state, phase: 'loading', error: null };
    case 'loaded':
      return {
        items: action.items,
        phase: 'ready',
        source: 'relay',
        updatedAt: action.at,
        error: null,
      };
    case 'error':
      return { ...state, phase: 'error', error: action.error };
  }
}

// ───────────────────────────────────────────────────────────────────
// 7. TRANSCRIPT DISPLAY TYPES
// ───────────────────────────────────────────────────────────────────

export interface UnknownTranscriptBlock {
  readonly id: string;
  readonly revision: number;
  readonly seq: number;
  readonly occurredAt: string;
  readonly kind: 'unknown';
  readonly originalKind: string;
}

export type TranscriptProvenance = 'relay' | 'cache' | 'optimistic';

export interface DisplayBlockMetadata {
  readonly provenance?: TranscriptProvenance;
  /** False is explicit: legacy blocks must not be upgraded by client inference. */
  readonly richEligible?: boolean;
}

type WebTranscriptBlock = Exclude<
  TranscriptBlock,
  { readonly kind: 'text_artifact' | 'attachment' }
>;

export type DisplayTranscriptBlock =
  | (WebTranscriptBlock & DisplayBlockMetadata)
  | (TextArtifactBlock & DisplayBlockMetadata)
  | (RedactedAttachmentBlock & DisplayBlockMetadata)
  | (UnknownTranscriptBlock & DisplayBlockMetadata);

export interface TranscriptState {
  readonly sessionId: string | null;
  readonly epoch: string | null;
  readonly coversThrough: number;
  readonly blocks: readonly DisplayTranscriptBlock[];
  readonly pendingPromptIds: readonly string[];
  readonly source: 'none' | 'cache' | 'relay';
  readonly updatedAt: string | null;
  readonly awaitingSnapshot: boolean;
  readonly gapReason: SyncGap['reason'] | null;
  readonly error: string | null;
}

export type TranscriptAction =
  | { readonly type: 'select'; readonly sessionId: string }
  | {
      readonly type: 'hydrate';
      readonly sessionId: string;
      readonly epoch: string | null;
      readonly coversThrough: number;
      readonly blocks: readonly DisplayTranscriptBlock[];
      readonly savedAt: string;
    }
  | {
      readonly type: 'page';
      readonly sessionId: string;
      readonly coversThrough: number;
      readonly blocks: readonly TranscriptBlock[];
      readonly at: string;
    }
  | { readonly type: 'snapshot'; readonly message: SyncSnapshot; readonly at: string }
  | { readonly type: 'delta'; readonly message: SyncDelta; readonly at: string }
  | { readonly type: 'gap'; readonly message: SyncGap }
  | {
      readonly type: 'promptOptimistic';
      readonly sessionId: string;
      readonly block: TranscriptBlock;
    }
  | {
      readonly type: 'promptAccepted';
      readonly sessionId: string;
      readonly optimisticId: string;
      readonly block: TranscriptBlock;
      readonly at: string;
    }
  | { readonly type: 'promptRejected'; readonly sessionId: string; readonly optimisticId: string }
  | { readonly type: 'error'; readonly error: string };

// ───────────────────────────────────────────────────────────────────
// 8. TRANSCRIPT REDUCER
// ───────────────────────────────────────────────────────────────────

export const EMPTY_TRANSCRIPT: TranscriptState = {
  sessionId: null,
  epoch: null,
  coversThrough: 0,
  blocks: [],
  pendingPromptIds: [],
  source: 'none',
  updatedAt: null,
  awaitingSnapshot: false,
  gapReason: null,
  error: null,
};

export function transcriptReducer(
  state: TranscriptState,
  action: TranscriptAction,
): TranscriptState {
  switch (action.type) {
    case 'select':
      return state.sessionId === action.sessionId
        ? state
        : { ...EMPTY_TRANSCRIPT, sessionId: action.sessionId };
    case 'hydrate':
      if (!matchesTranscriptSession(state, action.sessionId) || state.source === 'relay')
        return state;
      return {
        sessionId: action.sessionId,
        epoch: action.epoch,
        coversThrough: action.coversThrough,
        blocks: normalizeBlocks(action.blocks, 'cache'),
        pendingPromptIds: [],
        source: 'cache',
        updatedAt: action.savedAt,
        awaitingSnapshot: false,
        gapReason: null,
        error: null,
      };
    case 'page':
      // A cache hydrate may omit volatile blocks while retaining the relay cursor. The
      // Authoritative page must still replace that history projection before sync resumes.
      if (
        !matchesTranscriptSession(state, action.sessionId) ||
        state.source === 'relay' ||
        state.awaitingSnapshot
      )
        return state;
      return {
        ...state,
        blocks: normalizeBlocks(action.blocks, 'relay'),
        source: 'relay',
        updatedAt: action.at,
        coversThrough: action.coversThrough,
        error: null,
      };
    case 'snapshot': {
      if (!matchesTranscriptSession(state, action.message.sessionId)) return state;
      return {
        sessionId: action.message.sessionId,
        epoch: action.message.epoch,
        coversThrough: action.message.coversThrough,
        blocks: blocksFromEnvelopes(
          action.message.envelopes,
          action.message.sessionId,
          action.message.epoch,
          action.message.coversThrough,
        ),
        pendingPromptIds: [],
        source: 'relay',
        updatedAt: action.at,
        awaitingSnapshot: false,
        gapReason: null,
        error: null,
      };
    }
    case 'delta': {
      if (
        !matchesTranscriptSession(state, action.message.sessionId) ||
        state.awaitingSnapshot
      )
        return state;
      if (isEpochChange(state, action.message.epoch)) return epochChangeState(state);
      const incoming = blocksFromEnvelopes(
        action.message.envelopes.filter((envelope) => envelope.seq > state.coversThrough),
        action.message.sessionId,
        action.message.epoch,
        action.message.coversThrough,
      );
      return {
        ...state,
        epoch: action.message.epoch,
        coversThrough: Math.max(state.coversThrough, action.message.coversThrough),
        blocks: normalizeBlocks([...state.blocks, ...incoming], 'relay'),
        source: 'relay',
        updatedAt: action.at,
        gapReason: null,
        error: null,
      };
    }
    case 'gap':
      if (!matchesTranscriptSession(state, action.message.sessionId)) return state;
      return {
        ...EMPTY_TRANSCRIPT,
        sessionId: state.sessionId,
        epoch: action.message.epoch,
        coversThrough: action.message.coversThrough,
        awaitingSnapshot: action.message.reason !== 'unknown-session',
        gapReason: action.message.reason,
        error:
          action.message.reason === 'unknown-session'
            ? 'This session is not available from the relay.'
            : null,
      };
    case 'promptOptimistic':
      // A submission belongs to the session that started it: a settlement
      // arriving after a session switch can never touch another session's rows.
      if (!matchesTranscriptSession(state, action.sessionId)) return state;
      return {
        ...state,
        ...reconcilePromptOptimistic(state.blocks, state.pendingPromptIds, action.block),
      };
    case 'promptAccepted':
      if (!matchesTranscriptSession(state, action.sessionId)) return state;
      return {
        ...state,
        ...reconcilePromptAccepted(
          state.blocks,
          state.pendingPromptIds,
          action.optimisticId,
          action.block,
        ),
        source: 'relay',
        updatedAt: action.at,
      };
    case 'promptRejected':
      if (!matchesTranscriptSession(state, action.sessionId)) return state;
      return {
        ...state,
        ...reconcilePromptRejected(state.blocks, state.pendingPromptIds, action.optimisticId),
      };
    case 'error':
      return { ...state, error: action.error };
  }
}

// ───────────────────────────────────────────────────────────────────
// 8B. SCOPE GUARD AND DRAFT RECONCILE (pure, single source of truth)
// ───────────────────────────────────────────────────────────────────

/**
 * True when a sync message or prompt settlement belongs to the session this
 * transcript is currently showing. An unselected transcript (sessionId null)
 * matches nothing — the same fail-closed result as the old inline `null !==
 * sessionId` guard, since a real session id is never null.
 */
export function matchesTranscriptSession(
  state: TranscriptState,
  sessionId: string,
): boolean {
  return state.sessionId !== null && state.sessionId === sessionId;
}

/**
 * True when a delta arrives under an epoch the transcript has not seen.
 * The relay changed generations, so the assembled history is invalid until
 * an authoritative snapshot replaces it.
 */
export function isEpochChange(state: TranscriptState, epoch: string): boolean {
  return state.epoch !== null && state.epoch !== epoch;
}

export function epochChangeState(state: TranscriptState): TranscriptState {
  return {
    ...EMPTY_TRANSCRIPT,
    sessionId: state.sessionId,
    awaitingSnapshot: true,
    error: 'The relay epoch changed. Waiting for an authoritative snapshot.',
  };
}

/** Echo an optimistic submission into the transcript as its raw draft. */
export function reconcilePromptOptimistic(
  blocks: readonly DisplayTranscriptBlock[],
  pendingPromptIds: readonly string[],
  block: TranscriptBlock,
): Pick<TranscriptState, 'blocks' | 'pendingPromptIds'> {
  return {
    blocks: normalizeBlocks([...blocks, block], 'optimistic'),
    pendingPromptIds: [...pendingPromptIds, block.id],
  };
}

/** Settle an optimistic draft with the host's echoed block, by host id. */
export function reconcilePromptAccepted(
  blocks: readonly DisplayTranscriptBlock[],
  pendingPromptIds: readonly string[],
  optimisticId: string,
  block: TranscriptBlock,
): Pick<TranscriptState, 'blocks' | 'pendingPromptIds'> {
  return {
    blocks: normalizeBlocks(
      [...blocks.filter((entry) => entry.id !== optimisticId), block],
      'relay',
    ),
    pendingPromptIds: pendingPromptIds.filter((id) => id !== optimisticId),
  };
}

/** Drop an optimistic draft, restoring the exact raw block it replaced. */
export function reconcilePromptRejected(
  blocks: readonly DisplayTranscriptBlock[],
  pendingPromptIds: readonly string[],
  optimisticId: string,
): Pick<TranscriptState, 'blocks' | 'pendingPromptIds'> {
  return {
    blocks: blocks.filter((block) => block.id !== optimisticId),
    pendingPromptIds: pendingPromptIds.filter((id) => id !== optimisticId),
  };
}

// ───────────────────────────────────────────────────────────────────
// 9. DISPLAY BLOCK PARSING
// ───────────────────────────────────────────────────────────────────

export function parseDisplayBlock(
  value: unknown,
  provenance: TranscriptProvenance = 'relay',
): DisplayTranscriptBlock | null {
  const protocolValue = stripDisplayMetadata(value);
  if (isTranscriptBlock(protocolValue)) {
    if (protocolValue.kind === 'attachment') {
      return isRedactedAttachmentBlock(protocolValue)
        ? annotateDisplayBlock(protocolValue, provenance)
        : toUnknownDisplayBlock(protocolValue, provenance);
    }
    return annotateDisplayBlock(protocolValue as DisplayTranscriptBlock, provenance);
  }
  if (
    !isRecord(protocolValue) ||
    !isOpaqueId(protocolValue.id) ||
    typeof protocolValue.kind !== 'string' ||
    typeof protocolValue.revision !== 'number' ||
    !Number.isSafeInteger(protocolValue.revision) ||
    protocolValue.revision <= 0 ||
    typeof protocolValue.seq !== 'number' ||
    !Number.isSafeInteger(protocolValue.seq) ||
    protocolValue.seq <= 0 ||
    typeof protocolValue.occurredAt !== 'string' ||
    Number.isNaN(Date.parse(protocolValue.occurredAt))
  ) {
    return null;
  }
  return toUnknownDisplayBlock(
    protocolValue as Pick<TranscriptBlock, 'id' | 'revision' | 'seq' | 'occurredAt' | 'kind'>,
    provenance,
  );
}

/** Resolve the explicit relay state, with a safe legacy inference for descriptors without it. */
export function filePreviewAvailability(block: FilePreviewBlock): FilePreviewAvailability {
  if (block.availability !== undefined) return block.availability;
  if (block.renderer === 'unsupported') return 'unsupported';
  if (block.renderer === 'pdf' && block.textLayerSafe !== true) return 'withheld';
  if (block.content.kind !== 'none') return 'ready';
  return block.redaction === 'withheld' ? 'withheld' : 'missing';
}

// ───────────────────────────────────────────────────────────────────
// 10. BLOCK NORMALIZATION HELPERS
// ───────────────────────────────────────────────────────────────────

function blocksFromEnvelopes(
  envelopes: readonly Envelope[],
  sessionId: string,
  epoch: string,
  coversThrough: number,
): readonly DisplayTranscriptBlock[] {
  const blocks: DisplayTranscriptBlock[] = [];
  for (const envelope of envelopes) {
    if (
      envelope.kind !== 'transcript.block' ||
      envelope.sessionId !== sessionId ||
      envelope.epoch !== epoch ||
      envelope.seq > coversThrough
    )
      continue;
    const block = parseDisplayBlock(envelope.payload, 'relay');
    if (block !== null && block.seq === envelope.seq) blocks.push(block);
  }
  return normalizeBlocks(blocks);
}

function normalizeBlocks(
  blocks: readonly (DisplayTranscriptBlock | TranscriptBlock)[],
  defaultProvenance: TranscriptProvenance = 'relay',
): readonly DisplayTranscriptBlock[] {
  const byId = new Map<string, DisplayTranscriptBlock>();
  for (const block of blocks) {
    const existingProvenance =
      'provenance' in block ? (block.provenance as TranscriptProvenance | undefined) : undefined;
    const displayBlock = toDisplayBlock(block, existingProvenance ?? defaultProvenance);
    const annotated = annotateDisplayBlock(
      displayBlock,
      displayBlock.provenance ?? defaultProvenance,
    );
    const current = byId.get(annotated.id);
    if (current === undefined || isLaterBlock(annotated, current)) {
      byId.set(annotated.id, annotated);
    }
  }
  return [...byId.values()].sort((left, right) => left.seq - right.seq);
}

function toDisplayBlock(
  block: DisplayTranscriptBlock | TranscriptBlock,
  provenance: TranscriptProvenance,
): DisplayTranscriptBlock {
  if (block.kind === 'attachment') {
    return annotateDisplayBlock(block as RedactedAttachmentBlock, provenance);
  }
  return annotateDisplayBlock(block as DisplayTranscriptBlock, provenance);
}

function toUnknownDisplayBlock(
  block: Pick<TranscriptBlock, 'id' | 'revision' | 'seq' | 'occurredAt' | 'kind'>,
  provenance: TranscriptProvenance,
): UnknownTranscriptBlock & DisplayBlockMetadata {
  return {
    id: block.id,
    revision: typeof block.revision === 'number' ? block.revision : 1,
    seq: block.seq,
    occurredAt: block.occurredAt,
    kind: 'unknown',
    originalKind: block.kind,
    provenance,
    richEligible: false,
  };
}

function annotateDisplayBlock(
  block: DisplayTranscriptBlock,
  provenance: TranscriptProvenance,
): DisplayTranscriptBlock {
  const protocolBlock = stripDisplayMetadata(block) as DisplayTranscriptBlock;
  return {
    ...protocolBlock,
    provenance,
    richEligible: protocolBlock.kind !== 'unknown' && isRichTranscriptBlock(protocolBlock),
  };
}

function stripDisplayMetadata(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const protocolValue = { ...value };
  delete protocolValue.provenance;
  delete protocolValue.richEligible;
  return protocolValue;
}

function isLaterBlock(left: DisplayTranscriptBlock, right: DisplayTranscriptBlock): boolean {
  if (typeof left.revision === 'number' && typeof right.revision === 'number') {
    return (
      left.revision > right.revision || (left.revision === right.revision && left.seq >= right.seq)
    );
  }
  if (typeof left.revision === 'string' && typeof right.revision === 'string') {
    return left.revision === right.revision ? left.seq >= right.seq : left.seq >= right.seq;
  }
  return left.seq >= right.seq;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
