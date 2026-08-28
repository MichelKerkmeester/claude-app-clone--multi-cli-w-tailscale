// ───────────────────────────────────────────────────────────────────
// MODULE: Onboarding Wizard Tests
// ───────────────────────────────────────────────────────────────────

// The wizard tests mount the actual component and assert the visible step, so
// a missing skip branch or terminal action makes the test fail in the DOM.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import OnboardingWizard from '../src/pages/enrollment/onboarding-wizard.svelte';
import type { OnboardingGate } from '../src/shared/state/onboarding-gates.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function gate(
  id: string,
  title: string,
  options = [{ value: 'continue', label: 'Continue' }],
): OnboardingGate {
  return { id, title, description: `${title} can be changed later.`, options };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('onboarding wizard', () => {
  it('does not render a made decision and advances to the outstanding step', async () => {
    const user = userEvent.setup();
    const made = gate('made', 'Already selected');
    const next = gate('next', 'Choose a pairing path');

    render(OnboardingWizard, {
      props: { gates: [{ ...made, decision: 'existing' }, next], decisions: {} },
    });

    expect(screen.queryByRole('heading', { name: 'Already selected' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a pairing path' })).toBeInTheDocument();
    expect(screen.getByText('Choose a pairing path can be changed later.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Setup choices complete' })).toBeInTheDocument();
  });

  it('does not render a no-op step and advances to a usable choice', () => {
    const denied = { ...gate('denied', 'Notifications permission'), noOp: true };
    const next = gate('next', 'Choose a pairing path');

    render(OnboardingWizard, { props: { gates: [denied, next], decisions: {} } });

    expect(
      screen.queryByRole('heading', { name: 'Notifications permission' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a pairing path' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('renders a terminal action from a no-option entry point and allows choices to reopen later', async () => {
    const user = userEvent.setup();
    const empty = gate('empty', 'Unavailable choice', []);
    const actionable = gate('actionable', 'Choose a local preference');

    const { rerender } = render(OnboardingWizard, {
      props: { gates: [empty], entryGateId: 'empty' },
    });

    expect(screen.getByRole('heading', { name: 'Setup choices complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change setup choices' }));

    expect(screen.getByRole('heading', { name: 'Setup choices complete' })).toBeInTheDocument();

    await rerender({ gates: [actionable], decisions: {} });
    expect(screen.getByRole('heading', { name: 'Choose a local preference' })).toBeInTheDocument();
    expect(screen.getByText('Choose a local preference can be changed later.')).toBeInTheDocument();
  });
});
