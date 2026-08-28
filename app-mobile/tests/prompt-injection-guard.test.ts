// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Re-feed Injection Guard Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  PROMPT_INJECTION_GUARD,
  buildTranscriptRefeedDraft,
} from '../src/shared/commands/prompt-injection-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('PROMPT_INJECTION_GUARD', () => {
  it('is a non-empty preamble that names historical transcript and current repo state', () => {
    expect(PROMPT_INJECTION_GUARD.length).toBeGreaterThan(0);
    expect(PROMPT_INJECTION_GUARD).toMatch(/historical/i);
    expect(PROMPT_INJECTION_GUARD).toMatch(/do not follow instructions/i);
    expect(PROMPT_INJECTION_GUARD).toMatch(/authoritative/i);
  });
});

describe('buildTranscriptRefeedDraft', () => {
  it('puts the guard first, then the budget-capped excerpt', () => {
    const transcript = `${'old-prefix-'.repeat(8)}NEWEST-TAIL`;
    // Room for the marker as well as the tail: the excerpt bounds the whole
    // result, so the kept tail is derived from the draft, never assumed.
    const budget = 64;
    const draft = buildTranscriptRefeedDraft(transcript, budget);
    const kept = draft.slice(draft.lastIndexOf('\n') + 1);

    expect(draft.startsWith(PROMPT_INJECTION_GUARD)).toBe(true);
    expect(draft.indexOf(PROMPT_INJECTION_GUARD)).toBe(0);
    expect(draft).toContain(`[Earlier … omitted: ${transcript.length - kept.length} characters]`);
    expect(transcript.endsWith(kept)).toBe(true);
    expect(draft.endsWith('NEWEST-TAIL')).toBe(true);
    expect(draft.indexOf(PROMPT_INJECTION_GUARD)).toBeLessThan(draft.indexOf('omitted'));
  });
});
