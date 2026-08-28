// ───────────────────────────────────────────────────────────────────
// MODULE: Launch Draft Adoption Tests
// ───────────────────────────────────────────────────────────────────
// The adoption policy is local-only: it consumes an optional host input without
// replacing text already present in the session composer.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { adoptLaunchDraft } from '../src/shared/commands/adopt-launch-draft.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('adoptLaunchDraft', () => {
  it('adopts a host draft into an empty session and marks that session handled', () => {
    expect(
      adoptLaunchDraft({
        sessionId: 'session-a',
        launchDraft: 'continue the parked work',
        currentDraft: '',
        alreadyHandled: false,
      }),
    ).toEqual({
      draft: 'continue the parked work',
      adopted: true,
      handled: true,
    });
  });

  it('does not resurrect a handled launch draft after the composer is cleared', () => {
    expect(
      adoptLaunchDraft({
        sessionId: 'session-a',
        launchDraft: 'continue the parked work',
        currentDraft: '',
        alreadyHandled: true,
      }),
    ).toEqual({
      draft: '',
      adopted: false,
      handled: false,
    });
  });

  it('keeps a non-empty composer untouched while consuming the launch-draft opportunity', () => {
    expect(
      adoptLaunchDraft({
        sessionId: 'session-a',
        launchDraft: 'host text',
        currentDraft: 'text being typed',
        alreadyHandled: false,
      }),
    ).toEqual({
      draft: 'text being typed',
      adopted: false,
      handled: true,
    });
  });

  it('fails closed when the host launch-draft field is absent', () => {
    expect(
      adoptLaunchDraft({
        sessionId: 'session-a',
        launchDraft: undefined,
        currentDraft: '',
        alreadyHandled: false,
      }),
    ).toEqual({
      draft: '',
      adopted: false,
      handled: false,
    });
  });
});
