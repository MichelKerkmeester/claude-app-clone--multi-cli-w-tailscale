import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RuntimeStrip from '../src/pages/chat/chrome/RuntimeStrip.svelte';
import {
  INITIAL_RUNTIME_STATE,
  type RuntimeControls,
  type RuntimeUiState,
} from '../src/shared/state/runtime.js';
import type { RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const READY: RuntimeUiState = {
  ...INITIAL_RUNTIME_STATE,
  status: 'ready',
  phase: 'ready-adjustable',
  state: HOST_STATE,
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('single-select ToggleGroup accessibility', () => {
  it('renders a radiogroup with selected and unselected radio options', () => {
    render(RuntimeStrip, {
      props: {
        controls: makeControls(READY),
        sheetOpen: false,
        onOpenEffortSheet: vi.fn(),
        effortTriggerRef: null,
      },
    });

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Build' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Plan' })).toHaveAttribute('aria-checked', 'false');
  });
});
