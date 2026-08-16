// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Strip Component Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

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

describe('RuntimeStrip', () => {
  it('renders host-confirmed model, effort, and mode with ready authority enabled', () => {
    render(<RuntimeStrip controls={makeControls(READY)} />);
    expect(screen.getByText('Model · DeepSeek Flash')).toBeInTheDocument();
    expect(screen.getByText('Effort · High')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Build' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Model/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Effort/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Build' })).toBeEnabled();
  });

  it('disables every control while authority is not ready', () => {
    render(
      <RuntimeStrip
        controls={makeControls({ ...READY, status: 'checking', phase: 'checking', state: null })}
      />,
    );
    expect(screen.getByRole('button', { name: /Model/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Build' })).toBeDisabled();
    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  it('disables every control in every non-ready authority state without raw error text', () => {
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
      const { unmount } = render(
        <RuntimeStrip
          controls={makeControls({
            ...READY,
            status,
            phase,
            error: 'raw-host-error-text',
            issue: { code: 'host-unavailable', retryAfterMs: null },
          })}
        />,
      );
      expect(screen.getByRole('button', { name: /^Model/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /^Effort/ })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Build' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Plan' })).toBeDisabled();
      // No raw issue text in the DOM or the accessibility tree.
      expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('drives set_mode from the Build/Plan toggle', async () => {
    const controls = makeControls(READY);
    render(<RuntimeStrip controls={controls} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Plan' }));
    expect(controls.setMode).toHaveBeenCalledWith('plan');
  });

  it('announces applying while a control is pending and reconcile on error', () => {
    const { rerender } = render(
      <RuntimeStrip
        controls={makeControls({
          ...READY,
          status: 'pending',
          phase: 'pending',
          pending: { type: 'set_thinking_level', level: 'max' },
        })}
      />,
    );
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
      />,
    );
    expect(screen.getByText('Unavailable — reconcile')).toBeInTheDocument();
  });
});
