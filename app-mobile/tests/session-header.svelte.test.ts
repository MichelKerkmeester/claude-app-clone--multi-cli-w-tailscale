// ───────────────────────────────────────────────────────────────────
// MODULE: Session Header Tests (Svelte port — shared sheet entry point)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/SessionHeader.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SessionHeader from '../src/pages/chat/chrome/session-header.svelte';
import { INITIAL_RUNTIME_STATE, type RuntimeControls, type RuntimeUiState } from '../src/shared/state/runtime.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function readyRuntime(state: RuntimeStateDto | null = HOST_STATE): RuntimeUiState {
  return {
    ...INITIAL_RUNTIME_STATE,
    status: state === null ? 'checking' : 'ready',
    phase: state === null ? 'checking' : 'ready-adjustable',
    state,
    models: state === null ? [] : [HOST_STATE.model as NonNullable<RuntimeStateDto['model']>],
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: state === null ? 'opening' : 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function makeControls(runtime: RuntimeUiState = readyRuntime()): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

function renderHeader({
  controls = makeControls(),
  sheetOpen = false,
  onOpenModelSheet = vi.fn(),
}: {
  readonly controls?: RuntimeControls;
  readonly sheetOpen?: boolean;
  readonly onOpenModelSheet?: ReturnType<typeof vi.fn>;
} = {}) {
  render(SessionHeader, {
    props: {
      onBack: vi.fn(),
      onInbox: vi.fn(),
      onReview: vi.fn(),
      theme: 'light',
      onThemeChange: vi.fn(),
      runtimeControls: controls,
      sheetOpen,
      onOpenModelSheet,
      modelTriggerRef: null,
    },
  });
  return { onOpenModelSheet };
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  // SessionHeader mounts a bits-ui Menu; if any test opens it, BodyScrollLock
  // restores body pointer-events on a deferred setTimeout that outlives
  // synchronous cleanup and leaks into the next test. Reset defensively.
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SessionHeader', () => {
  it('renders the confirmed model and effort as separate spans inside one localized readout', () => {
    renderHeader();
    const trigger = screen.getByRole('button', {
      name: 'Model, DeepSeek Flash, deepseek, Thinking effort, High',
    });
    expect(trigger.querySelector('.session-model-name')).toHaveTextContent('DeepSeek Flash');
    expect(trigger.querySelector('.session-effort-name')).toHaveTextContent('High');
  });

  it('opens the shared sheet at the model section and mirrors open state on the trigger', async () => {
    const user = userEvent.setup();
    const { onOpenModelSheet } = renderHeader({ sheetOpen: false });
    const trigger = screen.getByRole('button', { name: /Model, DeepSeek Flash/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'model-effort-dialog');

    await user.click(trigger);
    expect(onOpenModelSheet).toHaveBeenCalledOnce();
  });

  it('mirrors the shared sheet open state on the trigger', () => {
    renderHeader({ sheetOpen: true });
    expect(screen.getByRole('button', { name: /Model, DeepSeek Flash/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('shows an em dash for the effort readout until a host-confirmed value exists', () => {
    renderHeader({ controls: makeControls(readyRuntime(null)) });
    expect(screen.getByRole('button', { name: /Thinking effort, —/ })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('never renders a raw unknown effort id in the readout', () => {
    const controls = makeControls(
      readyRuntime({
        ...HOST_STATE,
        thinkingLevel: 'host-weird-level',
        availableThinkingLevels: ['host-weird-level', 'high'],
      }),
    );
    renderHeader({ controls });
    expect(
      screen.getByRole('button', {
        name: 'Model, DeepSeek Flash, deepseek, Thinking effort, Host-defined level 1',
      }),
    ).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toContain('host-weird-level');
  });

  it('keeps the plan badge host-confirmed', () => {
    renderHeader({ controls: makeControls(readyRuntime({ ...HOST_STATE, mode: 'plan' })) });
    expect(screen.getByLabelText('Plan mode')).toHaveTextContent('Plan');
  });
});
