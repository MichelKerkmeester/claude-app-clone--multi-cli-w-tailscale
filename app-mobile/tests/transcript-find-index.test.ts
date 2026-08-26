// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Find Index Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { normalizeTranscriptBlocks } from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';
import {
  buildTranscriptFindIndex,
  createFindCursor,
  matchFindQuery,
  nextFindMatch,
  prevFindMatch,
} from '../src/pages/chat/transcript/transcript-find-index.js';
import { groupNormalizedTranscript } from '../src/pages/chat/transcript/transcript-helpers.js';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

const BLOCKS: readonly DisplayTranscriptBlock[] = [
  {
    id: 'block_a',
    revision: 1,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'text',
    role: 'user',
    text: 'Alpha one\nAlpha two',
  },
];

describe('transcript find index', () => {
  it('lowercases once per snapshot and wraps the 1-based cursor', () => {
    const normalized = normalizeTranscriptBlocks({
      sessionId: 'session_find_logic',
      blocks: BLOCKS,
      settled: true,
    });
    const items = groupNormalizedTranscript(normalized, BLOCKS);
    const index = buildTranscriptFindIndex(BLOCKS, items);
    expect(index.snippets.map((snippet) => snippet.haystack)).toEqual(['alpha one', 'alpha two']);
    const matches = matchFindQuery(index, 'ALPHA');
    expect(matches).toHaveLength(2);
    let cursor = createFindCursor(matches);
    expect(cursor.matchIndex).toBe(1);
    cursor = nextFindMatch(cursor);
    expect(cursor.matchIndex).toBe(2);
    cursor = nextFindMatch(cursor);
    expect(cursor.matchIndex).toBe(1);
    cursor = prevFindMatch(cursor);
    expect(cursor.matchIndex).toBe(2);
  });
});
