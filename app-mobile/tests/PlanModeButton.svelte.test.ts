import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_RUNTIME_STATE, runtimeReducer, type RuntimeUiState } from '../src/shared/data/runtime.js';
import PlanModeButton from '../src/pages/chat/chrome/PlanModeButton.svelte';
import { planModePresentation } from '../src/pages/chat/chrome/planModePresentation.js';

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: null,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MODELS: RuntimeModelCatalogDto = {
  sessionId: 'session_local',
  catalogRevision: 7,
  runtimeRevision: 4,
  currentModel: null,
  streaming: false,
  canSetModelWhileStreaming: false,
  models: [],
};

function readyWith(state: RuntimeStateDto): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, { type: 'hydrated', state, models: MODELS });
}

/** A set_mode intent in flight; the confirmed state is the opposite mode. */
function pendingMode(target: 'build' | 'plan'): RuntimeUiState {
  return runtimeReducer(readyWith({ ...HOST_STATE, mode: target === 'plan' ? 'build' : 'plan' }), {
    type: 'control-start',
    operation: { type: 'set_mode', mode: target },
  });
}

function failedWith(
  phase: RuntimeUiState['phase'],
  lastOutcome?: RuntimeUiState['lastOutcome'],
): RuntimeUiState {
  return {
    ...readyWith(HOST_STATE),
    status: 'error',
    phase,
    lastOutcome: lastOutcome ?? null,
  };
}

// The menu is a controlled bits-ui root: its open value lives in the parent
// (isOpen) and flows back through onOpenChange, exactly as the React oracle's
// own Harness. Recording the requested flag and only applying it via a fresh
// re-render AFTER the click settles reproduces that ownership without an open
// menu stealing focus mid-press.
function renderButton(
  runtime: RuntimeUiState,
  connection = 'live',
  overrides: Partial<{
    readonly onSelectPlan: () => void;
    readonly onSelectBuild: () => void;
  }> = {},
) {
  const onSelectPlan = vi.fn(overrides.onSelectPlan ?? (() => undefined));
  const onSelectBuild = vi.fn(overrides.onSelectBuild ?? (() => undefined));
  let lastOpenFlag = false;
  const onOpenChange = vi.fn((open: boolean) => {
    lastOpenFlag = open;
  });
  const view = render(PlanModeButton, {
    props: {
      runtime,
      connection,
      isOpen: false,
      onOpenChange,
      onSelectPlan,
      onSelectBuild,
      buttonRef: null,
    },
  });
  return {
    onSelectPlan,
    onSelectBuild,
    onOpenChange,
    openMenu: async () => {
      await view.rerender({ isOpen: lastOpenFlag });
    },
    ...view,
  };
}

afterEach(() => {
  cleanup();
  // Opening the menu makes bits-ui's body scroll-lock set pointer-events:
  // none on document.body; it restores that only on a deferred timer that can
  // outlive this test and then poison the next render's clicks. Clear it here
  // so each test starts from a clean pointer-events state.
  document.body.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('planModePresentation derivation', () => {
  it('shows Checking mode… and never Build before a host snapshot exists', () => {
    const checking = planModePresentation(INITIAL_RUNTIME_STATE, 'live');
    expect(checking.kind).toBe('checking');
    expect(checking.label).toBe('Checking mode…');
    expect(checking.disabled).toBe(true);
    expect(checking.accessibleName).not.toMatch(/Build/);
  });

  it('shows host-confirmed Build with a consequence-bearing name', () => {
    const build = planModePresentation(readyWith(HOST_STATE), 'live');
    expect(build.kind).toBe('build');
    expect(build.label).toBe('Build');
    expect(build.disabled).toBe(false);
    expect(build.accessibleName).toBe(
      'Agent mode: Build. Pi may request write-capable tools; approvals still apply.',
    );
  });

  it('shows Plan · read-only with a read-only consequence name', () => {
    const plan = planModePresentation(readyWith({ ...HOST_STATE, mode: 'plan' }), 'live');
    expect(plan.kind).toBe('plan');
    expect(plan.label).toBe('Plan · read-only');
    expect(plan.disabled).toBe(false);
    expect(plan.accessibleName).toBe('Agent mode: Plan, read-only.');
  });

  it('shows Executing plan as its own state, never read-only, with rows disabled', () => {
    const executing = planModePresentation(
      readyWith({ ...HOST_STATE, mode: 'executing-plan' }),
      'live',
    );
    expect(executing.kind).toBe('executing');
    expect(executing.label).toBe('Executing plan');
    expect(executing.label).not.toMatch(/read-only/i);
    expect(executing.rowsDisabledReason).toBe('Plan execution is in progress.');
  });

  it('keeps Build confirmed with Applying copy while entering plan', () => {
    const entering = planModePresentation(pendingMode('plan'), 'live');
    expect(entering.kind).toBe('applying');
    expect(entering.label).toContain('Build');
    expect(entering.label).toContain('Applying');
    expect(entering.disabled).toBe(true);
  });

  it('keeps Plan confirmed with Applying copy while leaving plan', () => {
    const leaving = planModePresentation(pendingMode('build'), 'live');
    expect(leaving.kind).toBe('applying');
    expect(leaving.label).toContain('Plan · read-only');
    expect(leaving.disabled).toBe(true);
  });

  it('disables mode control while a turn is running and explains why', () => {
    const running = planModePresentation(readyWith({ ...HOST_STATE, streaming: true }), 'live');
    expect(running.kind).toBe('running');
    expect(running.label).toBe('Build');
    expect(running.disabled).toBe(true);
    expect(running.description).toBe('Stop the current turn before changing mode.');
  });

  it('labels offline with the last confirmed mode and never enables mutation', () => {
    const offline = planModePresentation(failedWith('offline'), 'live');
    expect(offline.kind).toBe('offline');
    expect(offline.label).toBe('Build · offline');
    expect(offline.disabled).toBe(true);
  });

  it('labels unenrolled devices as forbidden with device authorization copy', () => {
    const forbidden = planModePresentation(readyWith(HOST_STATE), 'unenrolled');
    expect(forbidden.kind).toBe('forbidden');
    expect(forbidden.label).toBe('Mode unavailable');
    expect(forbidden.description).toBe('Device not authorized.');
    expect(forbidden.disabled).toBe(true);
  });

  it('labels foreground-required as forbidden with foreground copy', () => {
    const forbidden = planModePresentation(failedWith('foreground-required'), 'live');
    expect(forbidden.kind).toBe('forbidden');
    expect(forbidden.description).toBe('Bring Pi Remote to the foreground.');
  });

  it('labels unsupported hosts with Plan unavailable copy', () => {
    const unsupported = planModePresentation(failedWith('unsupported'), 'live');
    expect(unsupported.kind).toBe('unsupported');
    expect(unsupported.label).toBe('Mode unavailable');
    expect(unsupported.description).toBe('Plan unavailable on this host.');
  });

  it('labels policy-blocked outcomes as extension errors, never raw text', () => {
    const extensionError = planModePresentation(
      failedWith('unsupported', 'policy_blocked'),
      'live',
    );
    expect(extensionError.kind).toBe('extension-error');
    expect(extensionError.description).toBe('Plan safety could not be verified.');
    expect(extensionError.accessibleName).not.toMatch(/policy_blocked|error/i);
  });

  it('labels delivery-unknown as unconfirmed and disables all mutation', () => {
    const unknown = runtimeReducer(readyWith(HOST_STATE), {
      type: 'control-settled',
      response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
    });
    const presentation = planModePresentation(unknown, 'live');
    expect(presentation.kind).toBe('delivery-unknown');
    expect(presentation.label).toBe('Mode unconfirmed');
    expect(presentation.label).not.toMatch(/Build/);
    expect(presentation.disabled).toBe(true);
  });

  it('disables the button while reconnecting even with a confirmed mode', () => {
    const reconnecting = planModePresentation(readyWith(HOST_STATE), 'reconnecting');
    expect(reconnecting.kind).toBe('build');
    expect(reconnecting.label).toBe('Build');
    expect(reconnecting.disabled).toBe(true);
  });

  it('never flashes an unconfirmed Build across degraded authority', () => {
    const states = [
      INITIAL_RUNTIME_STATE,
      pendingMode('plan'),
      failedWith('offline'),
      failedWith('unsupported'),
      failedWith('foreground-required'),
      runtimeReducer(readyWith(HOST_STATE), {
        type: 'control-settled',
        response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
      }),
    ];
    for (const runtime of states) {
      const presentation = planModePresentation(runtime, 'live');
      expect(presentation.label).not.toBe('Build');
    }
  });
});

describe('PlanModeButton DOM behavior', () => {
  it('renders one accessible button with the consequence name and shortcut hints', () => {
    renderButton(readyWith(HOST_STATE));
    const button = screen.getByRole('button', { name: /Agent mode: Build/ });
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Shift+Tab Meta+Shift+M');
    expect(button).toHaveAttribute('aria-haspopup');
    expect(button).toBeEnabled();
    expect(within(button).getByText('Build')).toBeInTheDocument();
  });

  it('shows Plan · read-only as the visible label when host-confirmed', () => {
    renderButton(readyWith({ ...HOST_STATE, mode: 'plan' }));
    const button = screen.getByRole('button', { name: /Agent mode: Plan, read-only/ });
    expect(within(button).getByText('Plan · read-only')).toBeInTheDocument();
  });

  it('shows Checking mode… and is disabled before authority is ready', () => {
    renderButton(INITIAL_RUNTIME_STATE);
    const button = screen.getByRole('button', { name: /Checking mode/ });
    expect(button).toBeDisabled();
    expect(within(button).getByText('Checking mode…')).toBeInTheDocument();
  });

  it('is one tab stop: a single button with the menu as a popup', () => {
    renderButton(readyWith(HOST_STATE));
    expect(screen.getAllByRole('button', { name: /Agent mode/ })).toHaveLength(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opening the menu moves focus only and causes zero mutations', async () => {
    const user = userEvent.setup();
    const { onSelectPlan, onSelectBuild, openMenu } = renderButton(readyWith(HOST_STATE));
    await user.click(screen.getByRole('button', { name: /Agent mode: Build/ }));
    await openMenu();
    const menu = await screen.findByRole('menu', { name: /Agent mode/ });
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    expect(onSelectPlan).not.toHaveBeenCalled();
    expect(onSelectBuild).not.toHaveBeenCalled();
  });

  it('does not open the menu from a disabled button', async () => {
    const user = userEvent.setup();
    renderButton(INITIAL_RUNTIME_STATE);
    await user.click(screen.getByRole('button', { name: /Checking mode/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('marks the confirmed row and leaves the other row enabled', async () => {
    const user = userEvent.setup();
    const { onSelectBuild, openMenu } = renderButton(readyWith({ ...HOST_STATE, mode: 'plan' }));
    await user.click(screen.getByRole('button', { name: /Agent mode: Plan/ }));
    await openMenu();
    const menu = await screen.findByRole('menu', { name: /Agent mode/ });
    const [buildRow, planRow] = within(menu).getAllByRole('menuitem');
    expect(planRow).toHaveAttribute('aria-disabled', 'true');
    expect(buildRow).not.toHaveAttribute('aria-disabled', 'true');
    await user.click(buildRow);
    await waitFor(() => expect(onSelectBuild).toHaveBeenCalledTimes(1));
  });

  it('shows the disabled reason when selection is unsafe (executing)', async () => {
    const user = userEvent.setup();
    const { openMenu } = renderButton(readyWith({ ...HOST_STATE, mode: 'executing-plan' }));
    await user.click(screen.getByRole('button', { name: /Agent mode: Executing plan/ }));
    await openMenu();
    const menu = await screen.findByRole('menu', { name: /Agent mode/ });
    for (const row of within(menu).getAllByRole('menuitem')) {
      expect(row).toHaveAttribute('aria-disabled', 'true');
    }
    expect(await screen.findByText('Plan execution is in progress.')).toBeInTheDocument();
  });

  it('never leaks raw host or issue text into the accessible name', () => {
    const presentations = [
      planModePresentation(INITIAL_RUNTIME_STATE, 'live'),
      planModePresentation(failedWith('offline'), 'live'),
      planModePresentation(failedWith('unsupported'), 'live'),
      planModePresentation(failedWith('unsupported', 'policy_blocked'), 'live'),
    ];
    for (const presentation of presentations) {
      expect(presentation.accessibleName).not.toMatch(
        /delivery-unknown|policy_blocked|host-unavailable|invalid-response|raw/i,
      );
    }
  });

  it('keeps the confirmed label stable through a stale settle (host changed)', () => {
    const stale = runtimeReducer(readyWith(HOST_STATE), {
      type: 'control-settled',
      response: { outcome: { status: 'stale', state: { ...HOST_STATE, revision: 9 } } },
    });
    const presentation = planModePresentation(stale, 'live');
    expect(presentation.kind).toBe('stale');
    expect(presentation.label).toBe('Build');
    expect(presentation.disabled).toBe(true);
  });
});