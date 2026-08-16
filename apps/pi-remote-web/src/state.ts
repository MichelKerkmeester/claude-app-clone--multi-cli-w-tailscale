// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Display State Reducers
// ───────────────────────────────────────────────────────────────────

import {
  isOpaqueId,
  isTranscriptBlock,
  type Envelope,
  type SessionCardDto,
  type SyncDelta,
  type SyncGap,
  type SyncSnapshot,
  type TranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';

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

export interface UnknownTranscriptBlock {
  readonly id: string;
  readonly revision: number;
  readonly seq: number;
  readonly occurredAt: string;
  readonly kind: 'unknown';
  readonly originalKind: string;
}

export type DisplayTranscriptBlock = TranscriptBlock | UnknownTranscriptBlock;

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
      if (state.sessionId !== action.sessionId || state.source === 'relay') return state;
      return {
        sessionId: action.sessionId,
        epoch: action.epoch,
        coversThrough: action.coversThrough,
        blocks: normalizeBlocks(action.blocks),
        pendingPromptIds: [],
        source: 'cache',
        updatedAt: action.savedAt,
        awaitingSnapshot: false,
        gapReason: null,
        error: null,
      };
    case 'page':
      if (state.sessionId !== action.sessionId || state.epoch !== null) return state;
      return {
        ...state,
        blocks: normalizeBlocks(action.blocks),
        source: 'relay',
        updatedAt: action.at,
        coversThrough: action.coversThrough,
        error: null,
      };
    case 'snapshot': {
      if (state.sessionId !== action.message.sessionId) return state;
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
      if (state.sessionId !== action.message.sessionId || state.awaitingSnapshot) return state;
      if (state.epoch !== null && state.epoch !== action.message.epoch) {
        return {
          ...EMPTY_TRANSCRIPT,
          sessionId: state.sessionId,
          awaitingSnapshot: true,
          error: 'The relay epoch changed. Waiting for an authoritative snapshot.',
        };
      }
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
        blocks: normalizeBlocks([...state.blocks, ...incoming]),
        source: 'relay',
        updatedAt: action.at,
        gapReason: null,
        error: null,
      };
    }
    case 'gap':
      if (state.sessionId !== action.message.sessionId) return state;
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
      // arriving after a session switch can never touch another session's
      // transcript rows.
      if (state.sessionId !== action.sessionId) return state;
      return {
        ...state,
        blocks: normalizeBlocks([...state.blocks, action.block]),
        pendingPromptIds: [...state.pendingPromptIds, action.block.id],
      };
    case 'promptAccepted':
      if (state.sessionId !== action.sessionId) return state;
      return {
        ...state,
        blocks: normalizeBlocks([
          ...state.blocks.filter((block) => block.id !== action.optimisticId),
          action.block,
        ]),
        pendingPromptIds: state.pendingPromptIds.filter((id) => id !== action.optimisticId),
        source: 'relay',
        updatedAt: action.at,
      };
    case 'promptRejected':
      if (state.sessionId !== action.sessionId) return state;
      return {
        ...state,
        blocks: state.blocks.filter((block) => block.id !== action.optimisticId),
        pendingPromptIds: state.pendingPromptIds.filter((id) => id !== action.optimisticId),
      };
    case 'error':
      return { ...state, error: action.error };
  }
}

export function parseDisplayBlock(value: unknown): DisplayTranscriptBlock | null {
  if (isTranscriptBlock(value)) return value;
  if (
    !isRecord(value) ||
    !isOpaqueId(value.id) ||
    typeof value.kind !== 'string' ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision <= 0 ||
    typeof value.seq !== 'number' ||
    !Number.isSafeInteger(value.seq) ||
    value.seq <= 0 ||
    typeof value.occurredAt !== 'string' ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    return null;
  }
  return {
    id: value.id,
    revision: value.revision,
    seq: value.seq,
    occurredAt: value.occurredAt,
    kind: 'unknown',
    originalKind: value.kind,
  };
}

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
    const block = parseDisplayBlock(envelope.payload);
    if (block !== null && block.seq === envelope.seq) blocks.push(block);
  }
  return normalizeBlocks(blocks);
}

function normalizeBlocks(
  blocks: readonly DisplayTranscriptBlock[],
): readonly DisplayTranscriptBlock[] {
  const byId = new Map<string, DisplayTranscriptBlock>();
  for (const block of blocks) {
    const current = byId.get(block.id);
    if (
      current === undefined ||
      block.revision > current.revision ||
      (block.revision === current.revision && block.seq >= current.seq)
    ) {
      byId.set(block.id, block);
    }
  }
  return [...byId.values()].sort((left, right) => left.seq - right.seq);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
