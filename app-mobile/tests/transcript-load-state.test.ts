// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Load Taxonomy Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  deriveTranscriptLoadState,
  nextHeldTranscriptBlocks,
} from '../src/pages/chat/transcript/transcript-load-state.js';
import { EMPTY_TRANSCRIPT, type DisplayTranscriptBlock } from '../src/shared/state/state.js';

const HELLO: DisplayTranscriptBlock = {
  id: 'block_logic_hello',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'text',
  role: 'assistant',
  text: 'Hello from host',
};

const UNKNOWN: DisplayTranscriptBlock = {
  id: 'block_logic_unknown',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'unknown',
  originalKind: 'future-block',
};

describe('deriveTranscriptLoadState', () => {
  it('classifies the five named states from host fields only', () => {
    expect(
      deriveTranscriptLoadState({
        transcript: { ...EMPTY_TRANSCRIPT, awaitingSnapshot: true },
        connection: 'connecting',
        heldBlocks: null,
      }).kind,
    ).toBe('loading');

    expect(
      deriveTranscriptLoadState({
        transcript: { ...EMPTY_TRANSCRIPT, source: 'relay', blocks: [HELLO] },
        connection: 'live',
        heldBlocks: null,
      }).kind,
    ).toBe('ok');

    expect(
      deriveTranscriptLoadState({
        transcript: { ...EMPTY_TRANSCRIPT, gapReason: 'retention' },
        connection: 'live',
        heldBlocks: [HELLO],
      }).kind,
    ).toBe('missing');

    expect(
      deriveTranscriptLoadState({
        transcript: { ...EMPTY_TRANSCRIPT, source: 'relay', blocks: [UNKNOWN] },
        connection: 'live',
        heldBlocks: null,
      }).kind,
    ).toBe('unsupported');

    expect(
      deriveTranscriptLoadState({
        transcript: { ...EMPTY_TRANSCRIPT, error: 'read failed' },
        connection: 'error',
        heldBlocks: null,
      }).kind,
    ).toBe('error');
  });

  it('holds an ok thread across an empty reload snapshot', () => {
    const held = nextHeldTranscriptBlocks(
      { ...EMPTY_TRANSCRIPT, source: 'none', blocks: [], awaitingSnapshot: true },
      [HELLO],
    );
    expect(held).toEqual([HELLO]);
    const view = deriveTranscriptLoadState({
      transcript: { ...EMPTY_TRANSCRIPT, source: 'none', blocks: [], awaitingSnapshot: true },
      connection: 'reconnecting',
      heldBlocks: held,
    });
    expect(view.kind).toBe('ok');
    expect(view.showThread).toBe(true);
    expect(view.blocks).toEqual([HELLO]);
  });
});
