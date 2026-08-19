// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Strip Component Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeStrip } from '../src/RuntimeStrip.js';
import type {
  RuntimeControls,
  RuntimePhase,
  RuntimeStatus,
  RuntimeUiState,
} from '../src/runtime.js';

const READY: RuntimeUiState = {
  status: 'ready',
  phase: 'ready-adjustable',
  state: {
    sessionId: 'session_local',
    revision: 4,
    model: { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    thinkingLevel: 'high',
    availableThinkingLevels: ['off', 'high', 'max'],
    mode: 'build',
    streaming: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  models: [
    { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' },
  ],
  pending: null,
  issue: null,
  error: null,
  deliveryUnknown: false,
};

function makeControls(runtime: RuntimeUiState): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn(async () => undefined),
    setModel: vi.fn(async () => undefined),
    setThinkingLevel: vi.fn(async () => undefined),
    setMode: vi.fn(async () => undefined),
  };
}

function renderStrip({
  runtime = READY,
  sheetOpen = false,
  onOpenEffortSheet = vi.fn(),
}: {
  readonly runtime?: RuntimeUiState;
  readonly sheetOpen?: boolean;
  readonly onOpenEffortSheet?: ReturnType<typeof vi.fn>;
} = {}) {
  const effortTriggerRef = createRef<HTMLButtonElement>();
  const controls = makeControls(runtime);
  const view = render(
    <RuntimeStrip
      controls={controls}
      sheetOpen={sheetOpen}
      onOpenEffortSheet={onOpenEffortSheet}
      effortTriggerRef={effortTriggerRef}
    />,
  );
  return { controls, onOpenEffortSheet, effortTriggerRef, ...view };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RuntimeStrip', () => {
  it('renders host-confirmed model and effort as separate spans plus Build/Plan', () => {
    renderStrip();
    const modelReadout = screen.getByText('DeepSeek Flash');
    expect(modelReadout.closest('.runtime-model-readout')?.textContent).toMatch(/Model/);
    expect(modelReadout.closest('.runtime-model-readout')?.textContent).toMatch(/DeepSeek Flash/);
    const effortTrigger = screen.getByRole('button', { name: 'Thinking effort, High' });
    expect(effortTrigger.textContent).toMatch(/Effort/);
    expect(effortTrigger.textContent).toMatch(/High/);
    expect(screen.getByRole('radio', { name: 'Build' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Build' })).toBeEnabled();
  });

  it('opens the shared sheet at the effort section through the summary trigger', async () => {
    const user = userEvent.setup();
    const { onOpenEffortSheet, effortTriggerRef } = renderStrip({ sheetOpen: false });
    const trigger = screen.getByRole('button', { name: 'Thinking effort, High' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'model-effort-dialog');
    expect(effortTriggerRef.current).toBe(trigger);

    await user.click(trigger);
    expect(onOpenEffortSheet).toHaveBeenCalledOnce();
  });

  it('mirrors the shared sheet open state on the effort trigger', () => {
    renderStrip({ sheetOpen: true });
    expect(screen.getByRole('button', { name: 'Thinking effort, High' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows an em dash readout and keeps Build/Plan disabled while authority is not ready', () => {
    renderStrip({ runtime: { ...READY, status: 'checking', phase: 'checking', state: null } });
    expect(screen.getByRole('button', { name: 'Thinking effort, —' })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('radio', { name: 'Build' })).toBeDisabled();
    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  it('never leaks raw error text and disables Build/Plan in every non-ready authority state', () => {
    const NON_READY_AUTHORITY: ReadonlyArray<readonly [RuntimePhase, RuntimeStatus]> = [
      ['checking', 'checking'],
      ['streaming', 'pending'],
      ['pending', 'pending'],
      ['stale', 'stale'],
      ['unsupported', 'error'],
      ['offline', 'error'],
      ['foreground-required', 'error'],
      ['rate-limited', 'error'],
      ['host-unavailable', 'error'],
      ['delivery-unknown', 'error'],
      ['inconsistent-state', 'error'],
    ];
    for (const [phase, status] of NON_READY_AUTHORITY) {
      const { unmount } = renderStrip({
        runtime: {
          ...READY,
          status,
          phase,
          error: 'raw-host-error-text',
          issue: { code: 'host-unavailable', retryAfterMs: null },
        },
      });
      expect(screen.getByRole('radio', { name: 'Build' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Plan' })).toBeDisabled();
      // No raw issue text in the DOM or the accessibility tree.
      expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('keeps Build/Plan behavior separate and host-confirmed', async () => {
    const user = userEvent.setup();
    const { controls } = renderStrip();
    await user.click(screen.getByRole('radio', { name: 'Plan' }));
    expect(controls.setMode).toHaveBeenCalledWith('plan');
  });

  it('renders a confirmed unknown effort id as a bounded ordinal with no raw host text', () => {
    renderStrip({
      runtime: {
        ...READY,
        state: {
          ...(READY.state as NonNullable<RuntimeUiState['state']>),
          thinkingLevel: 'host-weird-level',
          availableThinkingLevels: ['host-weird-level', 'high'],
        },
      },
    });
    expect(screen.getByRole('button', { name: 'Thinking effort, Host-defined level 1' })).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toContain('host-weird-level');
  });

  it('announces applying while a control is pending and reconcile on error', () => {
    const { rerender } = renderStrip({
      runtime: {
        ...READY,
        status: 'pending',
        phase: 'pending',
        pending: { type: 'set_thinking_level', level: 'max' },
      },
    });
    expect(screen.getByText('Applying…')).toBeInTheDocument();

    rerender(
      <RuntimeStrip
        controls={makeControls({
          ...READY,
          status: 'error',
          phase: 'delivery-unknown',
          error: 'x',
          deliveryUnknown: true,
        })}
        sheetOpen={false}
        onOpenEffortSheet={vi.fn()}
        effortTriggerRef={createRef<HTMLButtonElement>()}
      />,
    );
    expect(screen.getByText('Unavailable — reconcile')).toBeInTheDocument();
  });
});
