// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Review Sheet Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/PlanReviewSheet.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
//
// The Svelte PlanReviewSheet is a bits-ui Dialog (Sheet/SheetContent) controlled
// by isOpen + onOpenChange, non-optimistic: sheetOpen is reset to the host
// isOpen after every onSheetOpenChange, so the host owns open state. It renders
// only when artifact is present and validity === 'valid'. Safe-action focus
// (Keep planning) is forced via onOpenAutoFocus + a deferred effect; dismissal
// routes through dismissSafely -> onOpenChange(false) and never executes.
//
// NOTE: bits-ui Dialog.Content emits BOTH aria-label (our "Review plan") and
// aria-labelledby (the Dialog.Title). Per the ARIA accessible-name algorithm
// aria-labelledby wins, so the dialog's computed name is the title text, not
// "Review plan". react-aria omits aria-labelledby when aria-label is supplied,
// which is why the React oracle can query `dialog { name: 'Review plan' }`.
// The labeling behavior is preserved (aria-label="Review plan" is on the
// dialog), so the port finds the single dialog by role and asserts the
// aria-label attribute instead of the computed name.

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PlanReviewSheet from '../src/lib/chrome/PlanReviewSheet.svelte';

const ARTIFACT: PlanArtifactDto = {
  planId: 'plan_001',
  planRevision: 2,
  title: 'Review the bounded change',
  summary: 'Only redacted plan content is shown on this device.',
  stepCount: 5,
  approachCount: 1,
  validity: 'valid',
  occurredAt: '2026-01-01T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  // bits-ui BodyScrollLock restores body pointer-events on a deferred
  // setTimeout that outlives svelte-testing-library's synchronous cleanup()
  // and leaks `pointer-events: none` on <body> into the next test (breaks
  // later click tests). Clear it explicitly.
  document.body.style.cssText = '';
  vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.href);
});

interface SheetOverrides {
  readonly isExecuting?: boolean;
}

function renderSheet(overrides: SheetOverrides = {}) {
  const callbacks = {
    onOpenChange: vi.fn(),
    onKeepPlanning: vi.fn(),
    onRevisePlan: vi.fn(),
    onLeaveWithoutRunning: vi.fn(),
    onExecuteReviewedPlan: vi.fn(),
  };
  render(PlanReviewSheet, {
    props: {
      isOpen: true,
      artifact: ARTIFACT,
      triggerRef: null,
      ...callbacks,
      ...overrides,
    },
  });
  return callbacks;
}

describe('PlanReviewSheet', () => {
  it('opens with Keep planning focused and exposes exactly four actions', async () => {
    renderSheet();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-label', 'Review plan');
    // bits-ui Dialog auto-focus is prevented; the safe action is focused via a
    // deferred setTimeout, so wait for focus to land on Keep planning.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Keep planning' })).toHaveFocus(),
    );
    expect(within(dialog).getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Execute reviewed plan' })).not.toHaveFocus();
  });

  it('routes each explicit action without treating dismissal as execution', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet();
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Revise plan' }));
    expect(callbacks.onRevisePlan).toHaveBeenCalledOnce();
    expect(callbacks.onExecuteReviewedPlan).not.toHaveBeenCalled();
  });

  it.each(['escape', 'backdrop', 'browser back', 'swipe down', 'focus loss'] as const)(
    'dismisses safely through %s',
    async (path) => {
      const callbacks = renderSheet();
      const user = userEvent.setup();
      const dialog = await screen.findByRole('dialog');
      const outside = document.createElement('button');
      outside.type = 'button';
      outside.textContent = 'outside';
      document.body.append(outside);

      if (path === 'escape') {
        await user.keyboard('{Escape}');
      } else if (path === 'backdrop') {
        const overlay = document.querySelector('.plan-review-overlay');
        if (!(overlay instanceof HTMLElement)) throw new Error('review overlay missing');
        await user.click(overlay);
      } else if (path === 'browser back') {
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (path === 'swipe down') {
        fireEvent.pointerDown(dialog, { pointerType: 'touch', clientX: 10, clientY: 10 });
        fireEvent.pointerUp(dialog, { pointerType: 'touch', clientX: 10, clientY: 80 });
      } else {
        outside.focus();
      }

      await waitFor(() => expect(callbacks.onOpenChange).toHaveBeenCalledWith(false));
      expect(callbacks.onExecuteReviewedPlan).not.toHaveBeenCalled();
      outside.remove();
    },
  );

  it('keeps execute pending and disables duplicate handoff', async () => {
    renderSheet({ isExecuting: true });
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Execute pending' })).toBeDisabled();
  });
});
