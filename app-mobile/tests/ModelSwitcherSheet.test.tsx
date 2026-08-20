import type {
  AvailableModelDto,
  RuntimeControlResponse,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelEffortSheet } from '../src/ModelEffortSheet.js';
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

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('zoom');
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ModelEffortSheet (model section)', () => {
  it('contains focus, initially focuses the current row, and restores the trigger without scrolling', async () => {
    const user = userEvent.setup();
    const controls = runtimeControls(readyRuntime(models(7)));
    const view = render(<HeaderHarness controls={controls} />);

    const trigger = screen.getByRole('button', { name: /Model, Alpha Current, alpha/ });
    await user.click(trigger);
    const current = await screen.findByRole('option', { name: /Alpha Current/ });
    await waitFor(() => expect(current).toHaveFocus());

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);

    const focus = vi.spyOn(trigger, 'focus');
    await user.click(screen.getByRole('button', { name: 'Close sheet' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    view.unmount();
  });

  it('uses one modal/listbox and keeps confirmed current separate from staged selection', async () => {
    const user = userEvent.setup();
    const setModel = vi.fn<RuntimeControls['setModel']>();
    renderSheet(models(7), setModel);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog')).toHaveAttribute('id', 'model-effort-dialog');
    expect(document.querySelectorAll('.react-aria-Popover')).toHaveLength(0);
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    const current = screen.getByRole('option', { name: /Alpha Current/ });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(current).toHaveTextContent('Current');
    expect(current).toHaveAccessibleName(
      'Alpha Current, alpha, alpha-current, Reasoning, Available, Current',
    );
    const currentId = current.querySelector('.model-sheet-row-id');
    expect(currentId).toHaveAttribute('dir', 'ltr');
    expect(currentId).toHaveAttribute('translate', 'no');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

    const target = screen.getByRole('option', { name: /Beta Next/ });
    await user.click(target);
    expect(target).toHaveAttribute('aria-selected', 'true');
    expect(target).toHaveTextContent('Selected');
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(setModel).not.toHaveBeenCalled();
  });

  it('keeps a polite live count mounted and contains autocomplete overflow', async () => {
    renderSheet(models(8), vi.fn<RuntimeControls['setModel']>());

    expect(screen.getByRole('searchbox', { name: 'Search models' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const modal = screen.getByRole('dialog').closest('.model-sheet-modal');
    const list = screen.getByRole('listbox', { name: 'Available models' });
    expect(modal).not.toBeNull();
    expect(getComputedStyle(modal as Element).maxWidth).toBe('100vw');
    expect(getComputedStyle(list).overflowX).toBe('hidden');
    const liveStatus = document.querySelector('[data-live-announcer="true"]');
    expect(liveStatus).toHaveAttribute('role', 'status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveAttribute('aria-atomic', 'true');
    expect(liveStatus?.closest('[aria-hidden="true"]')).toBeNull();
    await waitFor(() => expect(liveStatus).toHaveTextContent('8 of 8 models'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Beta Next' } });
    await waitFor(() => expect(liveStatus).toHaveTextContent('1 of 8 model'));
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

  it('marks the pending row busy and makes every dismissal path inert while committing', async () => {
    const user = userEvent.setup();
    let resolveCommit: ((value: RuntimeControlResponse) => void) | undefined;
    const setModel = vi.fn<RuntimeControls['setModel']>().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCommit = resolve;
        }),
    );
    const onOpenChange = vi.fn();
    renderSheet(models(7), setModel, onOpenChange);

    const target = screen.getByRole('option', { name: /Beta Next/ });
    await user.click(target);
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Beta Next/ })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );
    expect(screen.getByRole('option', { name: /Beta Next/ })).toHaveAccessibleDescription(
      /Applying/,
    );
    expect(screen.getByRole('button', { name: 'Close sheet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(target, { key: 'Escape' });
    const overlay = document.querySelector<HTMLElement>('.model-sheet-overlay');
    if (overlay === null) throw new Error('Expected sheet overlay');
    await user.click(overlay);
    fireEvent.pointerDown(screen.getByTestId('model-sheet-drag-region'), {
      pointerId: 1,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByTestId('model-sheet-drag-region'), {
      pointerId: 1,
      clientY: 400,
    });
    fireEvent.pointerUp(screen.getByTestId('model-sheet-drag-region'), {
      pointerId: 1,
      clientY: 400,
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    resolveCommit?.({
      outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5, model: TARGET } },
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('dismisses only from a qualifying header swipe and snaps shorter travel back', () => {
    const onOpenChange = vi.fn();
    renderSheet(models(7), vi.fn<RuntimeControls['setModel']>(), onOpenChange);
    const modal = document.querySelector<HTMLElement>('.model-sheet-modal');
    if (modal === null) throw new Error('Expected sheet modal');
    vi.spyOn(modal, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 500,
      width: 320,
      height: 500,
      toJSON: () => ({}),
    });
    const dragRegion = screen.getByTestId('model-sheet-drag-region');

    fireEvent.pointerDown(dragRegion, { pointerId: 2, clientY: 20, button: 0 });
    fireEvent.pointerMove(dragRegion, { pointerId: 2, clientY: 80 });
    fireEvent.pointerCancel(dragRegion, { pointerId: 2, clientY: 80 });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(modal.style.getPropertyValue('--model-sheet-drag-offset')).toBe('0px');

    fireEvent.pointerDown(screen.getByRole('listbox'), {
      pointerId: 3,
      clientY: 20,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByRole('listbox'), { pointerId: 3, clientY: 250 });
    fireEvent.pointerUp(screen.getByRole('listbox'), { pointerId: 3, clientY: 250 });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    const clock = vi.spyOn(performance, 'now').mockReturnValue(100);
    fireEvent.pointerDown(dragRegion, { pointerId: 4, clientY: 20, button: 0 });
    clock.mockReturnValue(120);
    fireEvent.pointerMove(dragRegion, { pointerId: 4, clientY: 50 });
    fireEvent.pointerUp(dragRegion, { pointerId: 4, clientY: 50 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    clock.mockRestore();
    onOpenChange.mockClear();

    fireEvent.pointerDown(dragRegion, { pointerId: 5, clientY: 20, button: 0 });
    fireEvent.pointerMove(dragRegion, { pointerId: 5, clientY: 180 });
    fireEvent.pointerUp(dragRegion, { pointerId: 5, clientY: 180 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('meets target sizes, contains 320px overflow, and has a transform-free reduced-motion mode', () => {
    renderSheet(models(8), vi.fn<RuntimeControls['setModel']>());
    const dialog = screen.getByRole('dialog');
    const modal = dialog.closest<HTMLElement>('.model-sheet-modal');
    const list = screen.getByRole('listbox');
    if (modal === null) throw new Error('Expected sheet modal');

    expect(
      logicalPixels(screen.getByRole('button', { name: 'Cancel' }), 'min-block-size'),
    ).toBeGreaterThanOrEqual(44);
    expect(
      logicalPixels(screen.getByRole('button', { name: 'Close sheet' }), 'min-block-size'),
    ).toBeGreaterThanOrEqual(44);
    expect(
      logicalPixels(screen.getByRole('option', { name: /Alpha Current/ }), 'min-block-size'),
    ).toBeGreaterThanOrEqual(48);
    expect(getComputedStyle(list).overscrollBehaviorY).toBe('contain');

    document.documentElement.style.zoom = '2';
    for (const element of [document.documentElement, document.body, modal, dialog, list]) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 320 },
        scrollWidth: { configurable: true, value: 320 },
      });
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    }

    const css = readFileSync('app-mobile/src/style.css', 'utf8');
    expect(css).toMatch(/\.model-sheet-row-id[\s\S]*?unicode-bidi: isolate;/u);
    expect(css).toMatch(
      /max-block-size: calc\(var\(--visual-viewport-height, 100dvh\) \* 0\.75\);/u,
    );
    expect(css).toContain('padding-block-end: max(16px, env(safe-area-inset-bottom));');
    expect(css).toMatch(
      /\.model-sheet-row\[data-focus-visible\][\s\S]*?outline-width: 2px;\s*outline-offset: 2px;/u,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.model-sheet-overlay button:active[\s\S]*?transform: none/u,
    );
    expect(css).toMatch(/\.model-sheet-skeleton,[\s\S]*?animation: none/u);
    expect(css).toMatch(/\.model-sheet-modal,[\s\S]*?\{\s*animation: none/u);
    document.documentElement.style.removeProperty('zoom');
  });

  it('keeps tickets, model IDs, and queries out of storage, URLs, caches, and console output', async () => {
    const user = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const cachePut = vi.fn();
    const indexedDbOpen = vi.fn();
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ put: cachePut }) });
    vi.stubGlobal('indexedDB', { open: indexedDbOpen });
    const consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const startUrl = window.location.href;
    const secretQuery = 'private-query-value';
    const secretTicket = 'ticket_private_001';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ ticket: secretTicket, expiresAt: '2099-08-16T10:05:00.000Z' }, 201),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5, model: TARGET } } },
          202,
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const setModel: RuntimeControls['setModel'] = (provider, modelId) =>
      controlRuntime(
        'session_local',
        HOST_STATE.revision,
        { type: 'set_model', provider, modelId },
        7,
      );
    renderSheet(models(8), setModel);

    const search = screen.getByRole('searchbox');
    await user.type(search, secretQuery);
    await waitFor(() => expect(search).toHaveValue(secretQuery));
    await user.clear(search);
    await waitFor(() => expect(search).toHaveValue(''));
    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const persistedOrLogged = [storageWrite, cachePut, indexedDbOpen, ...consoleSpies]
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .map(String)
      .join(' ');
    expect(persistedOrLogged).not.toContain(secretTicket);
    expect(persistedOrLogged).not.toContain(TARGET.id);
    expect(persistedOrLogged).not.toContain(secretQuery);
    expect(window.location.href).toBe(startUrl);
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

  it('surfaces access loss as visible bounded copy with no alert region and no host error', () => {
    renderSheet(models(7), vi.fn<RuntimeControls['setModel']>(), vi.fn(), {
      ...readyRuntime(models(7)),
      status: 'error',
      catalogPhase: 'access_denied',
      error: 'sensitive-host-error',
    });

    expect(screen.getByText('Access expired.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('sensitive-host-error')).not.toBeInTheDocument();
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
    const onOpenChange = vi.fn();
    renderSheet(models(7), setModel, onOpenChange);

    await user.click(screen.getByRole('option', { name: /Beta Next/ }));
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(setModel).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Switch model' })).toBeDisabled();
    if (_name === 'delivery unknown') {
      // The barrier stays visible copy only; the polite atomic status region
      // carries the one announcement and no competing alert exists.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const announcer = document.querySelector('[data-live-announcer="true"]');
      expect(announcer).not.toBeNull();
      expect(announcer).toHaveAttribute('aria-live', 'polite');
      expect(announcer).toHaveTextContent(
        'Outcome unknown · Reconcile before switching again.',
      );
    }
    await user.click(screen.getByRole('button', { name: 'Close sheet' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates the header readouts only after the host-confirmed response resolves', async () => {
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
        sheetOpen={false}
        onOpenModelSheet={vi.fn()}
        modelTriggerRef={{ current: null }}
      />
    );

    const view = render(header(readyRuntime(models(7))));
    await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Alpha Current');
    expect(document.querySelector('.session-effort-name')).toHaveTextContent('High');
    view.rerender(
      header({
        ...readyRuntime(models(7)),
        status: 'pending',
        pending: { type: 'set_model', provider: 'beta', modelId: 'beta-next' },
      }),
    );
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Alpha Current');
    expect(document.querySelector('.session-effort-name')).toHaveTextContent('High');
    view.rerender(
      header(
        readyRuntime(models(7), {
          ...HOST_STATE,
          revision: 5,
          model: TARGET,
          thinkingLevel: 'max',
        }),
      ),
    );
    expect(document.querySelector('.session-model-name')).toHaveTextContent('Beta Next');
    expect(document.querySelector('.session-effort-name')).toHaveTextContent('Max');
    view.rerender(
      header(
        readyRuntime(models(7), {
          ...HOST_STATE,
          revision: 5,
          model: TARGET,
          thinkingLevel: 'max',
          mode: 'plan',
        }),
      ),
    );
    expect(screen.getByLabelText('Plan mode')).toHaveTextContent('Plan');
    const css = readFileSync('app-mobile/src/style.css', 'utf8');
    expect(css).toMatch(/\.session-model-name[\s\S]*?animation: model-header-accepted 150ms/u);
  });
});

function HeaderHarness({ controls }: { readonly controls: RuntimeControls }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button type="button">Outside before</button>
      <SessionHeader
        onBack={vi.fn()}
        onInbox={vi.fn()}
        onReview={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        runtimeControls={controls}
        sheetOpen={open}
        onOpenModelSheet={() => setOpen(true)}
        modelTriggerRef={triggerRef}
      />
      <button type="button">Outside after</button>
      <ModelEffortSheet
        isOpen={open}
        onOpenChange={setOpen}
        initialSection="model"
        runtimeControls={controls}
        triggerRef={triggerRef}
      />
    </>
  );
}

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
    <ModelEffortSheet
      isOpen
      onOpenChange={onOpenChange}
      initialSection="model"
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

function logicalPixels(element: Element, property: string): number {
  return Number.parseFloat(getComputedStyle(element).getPropertyValue(property));
}
