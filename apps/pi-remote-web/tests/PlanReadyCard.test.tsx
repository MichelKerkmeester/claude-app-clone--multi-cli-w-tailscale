import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

import { PlanReadyCard } from '../src/PlanReadyCard.js';

const ARTIFACT: PlanArtifactDto = {
  planId: 'plan_001',
  planRevision: 4,
  title: 'Harden the relay boundary',
  summary: 'A redacted implementation outline.',
  stepCount: 7,
  approachCount: 2,
  validity: 'valid',
  occurredAt: '2026-01-01T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCard(overrides: Partial<React.ComponentProps<typeof PlanReadyCard>> = {}) {
  const onReview = vi.fn();
  render(<PlanReadyCard artifact={ARTIFACT} isLive onReview={onReview} {...overrides} />);
  return onReview;
}

describe('PlanReadyCard', () => {
  it('renders only the newest live valid artifact and exposes review', async () => {
    const onReview = renderCard();

    expect(screen.getByRole('article')).toHaveAttribute('data-plan-ready', 'true');
    expect(screen.getByRole('heading', { name: 'Harden the relay boundary' })).toBeInTheDocument();
    expect(screen.getByText('A redacted implementation outline.')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Review plan' }));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it.each([
    ['cached', { isLive: false }],
    ['superseded', { artifact: { ...ARTIFACT, validity: 'superseded' as const } }],
    ['invalid', { artifact: { ...ARTIFACT, validity: 'invalid' as const } }],
    ['older revision', { isNewest: false }],
  ])('keeps %s artifacts out of the executable card', (_label, overrides) => {
    renderCard(overrides);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review plan/ })).not.toBeInTheDocument();
  });

  it('does not enable review until the live binding has been obtained', () => {
    renderCard({ canReview: false });
    expect(screen.getByRole('button', { name: 'Waiting for live confirmation' })).toBeDisabled();
    expect(screen.queryByText(/token_plan_binding/)).not.toBeInTheDocument();
  });
});
