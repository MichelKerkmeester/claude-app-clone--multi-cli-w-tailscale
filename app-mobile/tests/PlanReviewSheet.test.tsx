import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

import { PlanReviewSheet } from '../src/PlanReviewSheet.js';

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
  vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.href);
});

function renderSheet(overrides: Partial<React.ComponentProps<typeof PlanReviewSheet>> = {}) {
  const callbacks = {
    onOpenChange: vi.fn(),
    onKeepPlanning: vi.fn(),
    onRevisePlan: vi.fn(),
    onLeaveWithoutRunning: vi.fn(),
    onExecuteReviewedPlan: vi.fn(),
  };
  render(<PlanReviewSheet isOpen artifact={ARTIFACT} {...callbacks} {...overrides} />);
  return callbacks;
}

describe('PlanReviewSheet', () => {
  it('opens with Keep planning focused and exposes exactly four actions', async () => {
    renderSheet();
    const dialog = await screen.findByRole('dialog', { name: 'Review plan' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep planning' })).toHaveFocus();
    expect(within(dialog).getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Execute reviewed plan' })).not.toHaveFocus();
  });

  it('routes each explicit action without treating dismissal as execution', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet();
    await user.click(screen.getByRole('button', { name: 'Revise plan' }));
    expect(callbacks.onRevisePlan).toHaveBeenCalledOnce();
    expect(callbacks.onExecuteReviewedPlan).not.toHaveBeenCalled();
  });

  it.each(['escape', 'backdrop', 'browser back', 'swipe down', 'focus loss'] as const)(
    'dismisses safely through %s',
    async (path) => {
      const callbacks = renderSheet();
      const user = userEvent.setup();
      const dialog = await screen.findByRole('dialog', { name: 'Review plan' });
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
        act(() => window.dispatchEvent(new PopStateEvent('popstate')));
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

  it('keeps execute pending and disables duplicate handoff', () => {
    renderSheet({ isExecuting: true });
    expect(screen.getByRole('button', { name: 'Execute pending' })).toBeDisabled();
  });
});
