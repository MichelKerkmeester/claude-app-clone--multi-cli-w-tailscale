// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Load Taxonomy
// ───────────────────────────────────────────────────────────────────

// Five named load states derived only from host-supplied transcript and
// connection fields. A missing, unsupported, or error read must never look
// like an empty conversation, and a reload must keep a rendered thread.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { ConnectionPhase, DisplayTranscriptBlock, TranscriptState } from '$shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type TranscriptLoadKind = 'loading' | 'ok' | 'missing' | 'unsupported' | 'error';

export interface TranscriptLoadView {
  readonly kind: TranscriptLoadKind;
  readonly title: string;
  readonly detail: string;
  readonly retryable: boolean;
  readonly showThread: boolean;
  readonly blocks: readonly DisplayTranscriptBlock[];
}

export interface TranscriptLoadInput {
  readonly transcript: TranscriptState;
  readonly connection: ConnectionPhase;
  readonly heldBlocks: readonly DisplayTranscriptBlock[] | null;
}

// ───────────────────────────────────────────────────────────────────
// 3. COPY
// ───────────────────────────────────────────────────────────────────

const LOAD_COPY: Record<
  TranscriptLoadKind,
  { readonly title: string; readonly detail: string; readonly retryable: boolean }
> = {
  loading: {
    title: 'Reading transcript',
    detail: 'Waiting for a host snapshot.',
    retryable: false,
  },
  ok: {
    title: '',
    detail: '',
    retryable: false,
  },
  missing: {
    title: 'Transcript missing',
    detail: 'This transcript is not available from the host.',
    retryable: true,
  },
  unsupported: {
    title: 'Transcript unsupported',
    detail: 'This transcript cannot be displayed here. Open it on the desktop app.',
    retryable: false,
  },
  error: {
    title: 'Transcript unreadable',
    detail: 'The transcript could not be read.',
    retryable: true,
  },
};

// ───────────────────────────────────────────────────────────────────
// 4. DERIVATION
// ───────────────────────────────────────────────────────────────────

function missingDetail(transcript: TranscriptState, connection: ConnectionPhase): string {
  if (transcript.gapReason === 'retention') {
    return 'This transcript was cleaned up on the host.';
  }
  if (transcript.gapReason === 'unknown-session') {
    return 'This session is not available from the relay.';
  }
  if (connection === 'offline' || connection === 'connecting' || connection === 'reconnecting') {
    return 'The host is not reachable yet.';
  }
  return LOAD_COPY.missing.detail;
}

function allBlocksUnsupported(blocks: readonly DisplayTranscriptBlock[]): boolean {
  return blocks.length > 0 && blocks.every((block) => block.kind === 'unknown');
}

function heldOkBlocks(
  transcript: TranscriptState,
  heldBlocks: readonly DisplayTranscriptBlock[] | null,
): readonly DisplayTranscriptBlock[] | null {
  if (heldBlocks === null || heldBlocks.length === 0) return null;
  if (transcript.gapReason === 'unknown-session') return null;
  if (allBlocksUnsupported(heldBlocks)) return null;
  return heldBlocks;
}

// Project the five-state taxonomy without inventing host fields.
export function deriveTranscriptLoadState(input: TranscriptLoadInput): TranscriptLoadView {
  const { transcript, connection, heldBlocks } = input;
  const liveBlocks = transcript.blocks;
  const retained = heldOkBlocks(transcript, heldBlocks);

  if (allBlocksUnsupported(liveBlocks) && retained === null) {
    return {
      kind: 'unsupported',
      ...LOAD_COPY.unsupported,
      showThread: false,
      blocks: liveBlocks,
    };
  }

  if (transcript.gapReason === 'unknown-session' || transcript.gapReason === 'retention') {
    return {
      kind: 'missing',
      title: LOAD_COPY.missing.title,
      detail: missingDetail(transcript, connection),
      retryable: false,
      showThread: false,
      blocks: [],
    };
  }

  if (transcript.error !== null && liveBlocks.length === 0 && retained === null) {
    return {
      kind: 'error',
      title: LOAD_COPY.error.title,
      detail: transcript.error,
      retryable: true,
      showThread: false,
      blocks: [],
    };
  }

  if (liveBlocks.length > 0) {
    return {
      kind: 'ok',
      ...LOAD_COPY.ok,
      showThread: true,
      blocks: liveBlocks,
    };
  }

  if (retained !== null) {
    return {
      kind: 'ok',
      ...LOAD_COPY.ok,
      showThread: true,
      blocks: retained,
    };
  }

  const waitingForHost =
    transcript.source === 'none' ||
    transcript.awaitingSnapshot ||
    connection === 'connecting' ||
    connection === 'authenticating' ||
    connection === 'reconnecting';

  if (connection === 'error' && liveBlocks.length === 0) {
    return {
      kind: 'error',
      title: LOAD_COPY.error.title,
      detail: transcript.error ?? LOAD_COPY.error.detail,
      retryable: true,
      showThread: false,
      blocks: [],
    };
  }

  if (connection === 'offline' && liveBlocks.length === 0 && transcript.source === 'none') {
    return {
      kind: 'missing',
      title: LOAD_COPY.missing.title,
      detail: missingDetail(transcript, connection),
      retryable: true,
      showThread: false,
      blocks: [],
    };
  }

  if (waitingForHost) {
    return {
      kind: 'loading',
      ...LOAD_COPY.loading,
      showThread: false,
      blocks: [],
    };
  }

  if (transcript.source === 'cache' || transcript.source === 'relay') {
    return {
      kind: 'ok',
      ...LOAD_COPY.ok,
      showThread: true,
      blocks: liveBlocks,
    };
  }

  return {
    kind: 'loading',
    ...LOAD_COPY.loading,
    showThread: false,
    blocks: [],
  };
}

// Keep a rendered thread across snapshot refreshes; drop it only when the
// host says the session is gone or the payload is unsupported.
export function nextHeldTranscriptBlocks(
  transcript: TranscriptState,
  previous: readonly DisplayTranscriptBlock[] | null,
): readonly DisplayTranscriptBlock[] | null {
  if (allBlocksUnsupported(transcript.blocks)) return null;
  if (transcript.gapReason === 'unknown-session' || transcript.gapReason === 'retention') {
    return null;
  }
  if (transcript.blocks.length > 0) return transcript.blocks;
  return previous;
}
