// ───────────────────────────────────────────────────────────────────
// MODULE: Sheet Back Dismiss Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LeavePlanSheet from '../src/pages/chat/chrome/sheet-leave-plan.svelte';
import PlanReviewSheet from '../src/pages/chat/chrome/sheet-plan-review.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const ARTIFACT: PlanArtifactDto = {
  planId: 'plan_back_dismiss',
  planRevision: 1,
  title: 'Review this plan',
  summary: 'A plan shown locally for review.',
  stepCount: 2,
  approachCount: 1,
  validity: 'valid',
  occurredAt: '2026-01-01T12:00:00.000Z',
};

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

interface PlanCallbacks {
  readonly onOpenChange: ReturnType<typeof vi.fn>;
  readonly onKeepPlanning: ReturnType<typeof vi.fn>;
  readonly onRevisePlan: ReturnType<typeof vi.fn>;
  readonly onLeaveWithoutRunning: ReturnType<typeof vi.fn>;
  readonly onExecuteReviewedPlan: ReturnType<typeof vi.fn>;
}

function planCallbacks(): PlanCallbacks {
  return {
    onOpenChange: vi.fn(),
    onKeepPlanning: vi.fn(),
    onRevisePlan: vi.fn(),
    onLeaveWithoutRunning: vi.fn(),
    onExecuteReviewedPlan: vi.fn(),
  };
}

function renderPlanReview(callbacks: PlanCallbacks): void {
  render(PlanReviewSheet, {
    props: {
      isOpen: true,
      artifact: ARTIFACT,
      triggerRef: null,
      ...callbacks,
    },
  });
}

interface LeaveCallbacks {
  readonly onOpenChange: ReturnType<typeof vi.fn>;
  readonly onSwitchToBuild: ReturnType<typeof vi.fn>;
  readonly onLeaveWithoutRunning: ReturnType<typeof vi.fn>;
}

function leaveCallbacks(): LeaveCallbacks {
  return {
    onOpenChange: vi.fn(),
    onSwitchToBuild: vi.fn(),
    onLeaveWithoutRunning: vi.fn(),
  };
}

function renderLeavePlan(callbacks: LeaveCallbacks): void {
  render(LeavePlanSheet, {
    props: {
      isOpen: true,
      triggerRef: null,
      ...callbacks,
    },
  });
}

afterEach(() => {
  cleanup();
  document.body.style.cssText = '';
  window.history.replaceState(null, '', window.location.href);
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('shared sheet back dismissal', () => {
  it('closes the plan review sheet on browser Back without changing the route', async () => {
    const callbacks = planCallbacks();
    renderPlanReview(callbacks);
    await screen.findByRole('dialog');
    const href = window.location.href;

    window.history.back();

    await waitFor(() => expect(callbacks.onOpenChange).toHaveBeenCalledWith(false));
    expect(window.location.href).toBe(href);
  });

  it('closes the leave-plan sheet on popstate without changing the route', async () => {
    const callbacks = leaveCallbacks();
    renderLeavePlan(callbacks);
    await screen.findByRole('heading', { name: 'Leave plan mode?' });
    const pathname = window.location.pathname;

    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(callbacks.onOpenChange).toHaveBeenCalledWith(false));
    expect(window.location.pathname).toBe(pathname);
  });

  it('adds one history entry for one plan review sheet', async () => {
    const callbacks = planCallbacks();
    const initialLength = window.history.length;
    renderPlanReview(callbacks);
    await screen.findByRole('dialog');

    expect(window.history.length).toBe(initialLength + 1);
  });

  it('dismisses only the topmost of two open sheets', async () => {
    const outer = leaveCallbacks();
    const inner = planCallbacks();
    renderLeavePlan(outer);
    renderPlanReview(inner);
    await screen.findByRole('heading', { name: 'Leave plan mode?' });
    await screen.findAllByRole('dialog');

    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(inner.onOpenChange).toHaveBeenCalledWith(false));
    expect(outer.onOpenChange).not.toHaveBeenCalled();
  });
});
