// ───────────────────────────────────────────────────────────────────
// MODULE: Banner Retraction Race Guard Tests
// ───────────────────────────────────────────────────────────────────

// The banner fixture is deliberately separate from any host notification DTO.
// Operations are asserted in order so a stale show cannot follow a dismissal.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  commitBannerShow,
  createBannerRetractionState,
  dismissBanner,
  requestBannerShow,
  type BannerNotice,
  type BannerOperation,
} from '../src/shared/state/banner-retraction.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function notice(id: string): BannerNotice {
  return { id };
}

function operations(...lists: readonly BannerOperation[][]): BannerOperation[] {
  return lists.flatMap((list) => list);
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('banner retraction race guard', () => {
  it('never emits a show when dismissal arrives before the show commit', () => {
    const banner = notice('dismissed-before-show');
    const dismissed = dismissBanner(createBannerRetractionState(), banner.id);
    const requested = requestBannerShow(dismissed.state, banner);
    const committed = commitBannerShow(requested.state, banner.id);

    expect(operations(dismissed.operations, requested.operations, committed.operations)).toEqual([]);
    expect(committed.state.visibleIds.has(banner.id)).toBe(false);
    expect(committed.state.dismissedIds.has(banner.id)).toBe(true);
  });

  it('cancels a pending show when dismissal arrives during the show transaction', () => {
    const banner = notice('dismissed-during-show');
    const requested = requestBannerShow(createBannerRetractionState(), banner);
    const dismissed = dismissBanner(requested.state, banner.id);
    const committed = commitBannerShow(dismissed.state, banner.id);

    expect(operations(requested.operations, dismissed.operations, committed.operations)).toEqual([]);
    expect(committed.state.visibleIds.has(banner.id)).toBe(false);
    expect(committed.state.pendingIds.has(banner.id)).toBe(false);
  });

  it('retracts an already-visible banner and never emits show after retract', () => {
    const banner = notice('visible-then-dismissed');
    const requested = requestBannerShow(createBannerRetractionState(), banner);
    const shown = commitBannerShow(requested.state, banner.id);
    const retracted = dismissBanner(shown.state, banner.id);
    const emitted = operations(requested.operations, shown.operations, retracted.operations);

    expect(emitted).toEqual([
      { type: 'show', id: banner.id },
      { type: 'retract', id: banner.id },
    ]);
    expect(emitted.findIndex((operation) => operation.type === 'retract')).toBeGreaterThan(
      emitted.findIndex((operation) => operation.type === 'show'),
    );

    const attemptedReshow = commitBannerShow(requestBannerShow(retracted.state, banner).state, banner.id);
    expect(attemptedReshow.operations).toEqual([]);
  });

  it('does not emit a second retraction for a repeated dismissal', () => {
    const banner = notice('dismiss-once');
    const shown = commitBannerShow(
      requestBannerShow(createBannerRetractionState(), banner).state,
      banner.id,
    );
    const first = dismissBanner(shown.state, banner.id);
    const second = dismissBanner(first.state, banner.id);

    expect(first.operations).toEqual([{ type: 'retract', id: banner.id }]);
    expect(second.operations).toEqual([]);
  });
});
