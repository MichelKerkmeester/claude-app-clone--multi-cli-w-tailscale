// ───────────────────────────────────────────────────────────────────
// MODULE: Deferred Send-Error Toast Store Tests
// ───────────────────────────────────────────────────────────────────
// The shell's single toast strip is fed by this module: raising replaces the
// standing toast with the newest failure, and dismissing clears it so the
// strip renders nothing again.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';

import {
  deferredSendErrorToast,
  dismissDeferredSendErrorToast,
  raiseDeferredSendError,
} from '../src/shared/state/deferred-send-error.svelte.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function scopedError(scopeKey: string, message: string) {
  return { scopeKey, message };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  dismissDeferredSendErrorToast();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('deferred send-error toast store', () => {
  it('raises one toast that the strip reads back', () => {
    raiseDeferredSendError(scopedError('session_a', 'The relay refused the send.'));

    expect(deferredSendErrorToast()).toEqual({
      scopeKey: 'session_a',
      message: 'The relay refused the send.',
    });
  });

  it('replaces a standing toast with the newest failure', () => {
    raiseDeferredSendError(scopedError('session_a', 'First failure.'));
    raiseDeferredSendError(scopedError('session_b', 'Second failure.'));

    expect(deferredSendErrorToast()).toEqual({
      scopeKey: 'session_b',
      message: 'Second failure.',
    });
  });

  it('dismisses the toast so the strip renders nothing again', () => {
    raiseDeferredSendError(scopedError('session_a', 'The relay refused the send.'));
    expect(deferredSendErrorToast()).not.toBeNull();

    dismissDeferredSendErrorToast();

    expect(deferredSendErrorToast()).toBeNull();
  });
});
