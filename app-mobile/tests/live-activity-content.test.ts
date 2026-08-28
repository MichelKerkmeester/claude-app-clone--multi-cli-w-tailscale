// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Content Fallback
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  LIVE_ACTIVITY_CLIP_LENGTH,
  resolveLiveActivityContent,
} from '../src/shared/format/live-activity-content.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const LONG_TEXT = 'x'.repeat(200);

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('live activity content fallback', () => {
  it('prefers the current turn prompt and labels it as You', () => {
    expect(
      resolveLiveActivityContent({
        prompt: 'Review the deployment diff',
        activity: 'Running tests',
        state: 'Working',
      }),
    ).toBe('You: Review the deployment diff');
  });

  it('uses the activity line when the prompt is absent', () => {
    expect(
      resolveLiveActivityContent({ prompt: undefined, activity: 'Running tests', state: 'Working' }),
    ).toBe('Running tests');
  });

  it('uses the plain state when both host content fields are absent', () => {
    expect(resolveLiveActivityContent({ state: 'Working' })).toBe('Working');
  });

  it('clips every tier to the same fixed length', () => {
    expect(LIVE_ACTIVITY_CLIP_LENGTH).toBe(80);
    expect(
      resolveLiveActivityContent({ prompt: LONG_TEXT, activity: 'unused', state: 'unused' }),
    ).toBe(`You: ${'x'.repeat(74)}…`);
    expect(
      resolveLiveActivityContent({ prompt: undefined, activity: LONG_TEXT, state: 'unused' }),
    ).toBe(`${'x'.repeat(79)}…`);
    expect(
      resolveLiveActivityContent({ prompt: undefined, activity: undefined, state: LONG_TEXT }),
    ).toBe(`${'x'.repeat(79)}…`);
  });

  it('returns no usable line when no content or state exists', () => {
    expect(resolveLiveActivityContent({ prompt: undefined, activity: undefined, state: '' })).toBeUndefined();
  });
});
