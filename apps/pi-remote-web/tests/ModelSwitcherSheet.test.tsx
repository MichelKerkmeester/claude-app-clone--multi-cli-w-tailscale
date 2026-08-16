import type {
  AvailableModelDto,
  RuntimeControlResponse,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelSwitcherSheet } from '../src/ModelSwitcherSheet.js';
import { SessionHeader } from '../src/SessionHeader.js';
import { controlRuntime } from '../src/relay.js';
import type { RuntimeControls, RuntimeUiState } from '../src/runtime.js';
import '../src/style.css';

const CURRENT: AvailableModelDto = {
  provider: 'alpha',
  id: 'alpha-current',
  label: 'Alpha Current',
  reasoning: true,
};
const TARGET: AvailableModelDto = {
  provider: 'beta',
  id: 'beta-next',
  label: 'Beta Next',
  input: ['text', 'image'],
};
const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: CURRENT,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

afterEach(() => vi.unstubAllGlobals());

describe('ModelSwitcherSheet', () => {
  it('uses one modal/listbox and keeps confirmed current separate from staged selection', async () => {
    const user = userEvent.setup();
    const setModel = vi.fn<RuntimeControls['setModel']>();
    renderSheet(models(7), setModel);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(document.querySelectorAll('.react-aria-Popover')).toHaveLength(0);
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    const current = screen.getByRole('option', { name: /Alpha Current/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveTextContent('Current');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    const target = screen.getByRole('option', { name: /Beta Next/ });
    await user.click(target);
    expect(target).toHaveAttribute('aria-selected', 'true');
    expect(target).toHaveTextContent('Selected');
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(setModel).not.toHaveBeenCalled();
  });

  it('shows in-place autocomplete search at eight models and contains horizontal overflow', () => {
    renderSheet(models(8), vi.fn<RuntimeControls['setModel']>());

    expect(screen.getByRole('searchbox', { name: 'Search models' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const modal = screen.getByRole('dialog').closest('.model-sheet-modal');
    const list = screen.getByRole('listbox', { name: 'Available models' });
    expect(modal).not.toBeNull();
    expect(getComputedStyle(modal as Element).maxWidth).toBe('100vw');
    expect(getComputedStyle(list).overflowX).toBe('hidden');
  });

  it('stages with Enter and clears search on Escape before dismissing', async () => {
    const setModel = vi.fn<RuntimeControls['setModel']>();
    const onOpenChange = vi.fn();
    renderSheet(models(8), setModel, onOpenChange);
    const search = screen.getByRole('searchbox', { name: 'Search models' });
    fireEvent.change(search, { target: { value: 'beta' } });
    fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(search).toHaveValue(''));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    const target = screen.getByRole('option', { name: /Beta Next/ });
    fireEvent.keyDown(target, { key: 'Enter' });
    await waitFor(() => expect(target).toHaveAttribute('aria-selected', 'true'));
    expect(setModel).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('option', { name: /Beta Next/ }), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('makes staging network-free and one Switch activation issues one bound ticket and command', async () => {
    const user = userEvent.setup();
    const acceptedState = { ...HOST_STATE, revision: 5, model: TARGET };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ ticket: 'ticket_model_001', expiresAt: '2099-08-16T10:05:00.000Z' }, 201),
      )
      .mockResolvedValueOnce(
        jsonResponse({ outcome: { status: 'accepted', state: acceptedState } }, 202),
      );
    vi.stubGlobal('fetch', fetchMock);
    const setModel: RuntimeControls['setModel'] = (provider, modelId) =>
      controlRuntime(
        'session_local',
        HOST_STATE.revision,
        { type: 'set_model', provider, modelId },
        7,
      );
    const onOpenChange = vi.fn();
    renderSheet(models(7), setModel, onOpenChange);

    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/runtime/ticket',
      expect.objectContaining({
        body: JSON.stringify({
          sessionId: 'session_local',
          expectedRevision: 4,
          expectedCatalogRevision: 7,
          operation: { type: 'set_model', provider: 'beta', modelId: 'beta-next' },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/runtime/control',
      expect.objectContaining({
        body: expect.stringContaining('"ticket":"ticket_model_001"'),
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows streaming browse and staging but gates commit from host capability', async () => {
    const user = userEvent.setup();
    const blocked = {
      ...readyRuntime(models(7), { ...HOST_STATE, streaming: true }),
      canSetModelWhileStreaming: false,
    };
    const view = renderSheet(models(7), vi.fn<RuntimeControls['setModel']>(), vi.fn(), blocked);
    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    expect(screen.getByText(/Available after the current turn/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch model' })).toBeDisabled();

    view.unmount();
    renderSheet(models(7), vi.fn<RuntimeControls['setModel']>(), vi.fn(), {
      ...blocked,
      canSetModelWhileStreaming: true,
    });
    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    expect(screen.getByRole('button', { name: 'Switch model' })).toBeEnabled();
  });

  it.each([
    [
      'stale',
      { outcome: { status: 'stale', state: { ...HOST_STATE, revision: 8 } } },
      'Host state changed. Choose again.',
    ],
    [
      'delivery unknown',
      { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
      'Outcome unknown · Reconcile before switching again.',
    ],
    [
      'unavailable',
      { outcome: { status: 'unavailable', reasonCode: 'model_unavailable' } },
      'That model is unavailable. Choose another model.',
    ],
    [
      'policy blocked',
      { outcome: { status: 'policy_blocked', reasonCode: 'policy_blocked' } },
      'Blocked by host policy.',
    ],
  ] as const)('does not retry a %s terminal outcome', async (_name, response, message) => {
    const user = userEvent.setup();
    const setModel = vi
      .fn<RuntimeControls['setModel']>()
      .mockResolvedValue(response as RuntimeControlResponse);
    renderSheet(models(7), setModel);

    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(setModel).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Switch model' })).toBeDisabled();
  });

  it('updates the header only after the host-confirmed response resolves', async () => {
    const user = userEvent.setup();
    const controls = (runtime: RuntimeUiState): RuntimeControls => ({
      runtime,
      refresh: vi.fn().mockResolvedValue(undefined),
      setModel: vi.fn().mockResolvedValue(null),
      setThinkingLevel: vi.fn().mockResolvedValue(null),
      setMode: vi.fn().mockResolvedValue(null),
    });
    const header = (runtime: RuntimeUiState) => (
      <SessionHeader
        onBack={vi.fn()}
        onInbox={vi.fn()}
        onReview={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        runtimeControls={controls(runtime)}
      />
    );

    const view = render(header(readyRuntime(models(7))));
    await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Alpha Current');
    view.rerender(
      header({
        ...readyRuntime(models(7)),
        status: 'pending',
        pending: { type: 'set_model', provider: 'beta', modelId: 'beta-next' },
      }),
    );
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Alpha Current');
    view.rerender(header(readyRuntime(models(7), { ...HOST_STATE, revision: 5, model: TARGET })));
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Beta Next');
  });
});

function models(count: number): readonly AvailableModelDto[] {
  const extras = Array.from({ length: Math.max(0, count - 2) }, (_, index) => ({
    provider: index % 2 === 0 ? 'alpha' : 'gamma',
    id: `model-${index + 1}`,
    label: `Model ${index + 1}`,
  }));
  return [CURRENT, TARGET, ...extras];
}

function readyRuntime(
  catalog: readonly AvailableModelDto[],
  state: RuntimeStateDto = HOST_STATE,
): RuntimeUiState {
  return {
    status: 'ready',
    state,
    models: catalog,
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function renderSheet(
  catalog: readonly AvailableModelDto[],
  setModel: RuntimeControls['setModel'],
  onOpenChange = vi.fn(),
  runtime = readyRuntime(catalog),
) {
  const controls: RuntimeControls = {
    ...runtimeControls(runtime),
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel,
  };
  return render(
    <ModelSwitcherSheet
      isOpen
      onOpenChange={onOpenChange}
      runtimeControls={controls}
      triggerRef={{ current: null }}
    />,
  );
}

function runtimeControls(runtime: RuntimeUiState): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
