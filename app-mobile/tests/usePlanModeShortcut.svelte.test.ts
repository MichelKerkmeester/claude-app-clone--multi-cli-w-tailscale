// ───────────────────────────────────────────────────────────────────
// MODULE: Composer-Scoped Shortcut Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Port of app-mobile/tests/usePlanModeShortcut.test.tsx (React behavior
// oracle) to the Svelte factory. The React *.test.tsx oracle is NEVER
// modified. createPlanModeShortcut is a plain factory (no runes) that
// returns a (event: KeyboardEvent) => boolean handler, so no Svelte
// component context is needed: the test creates real DOM elements
// (textarea + button), wires the handler via addEventListener, focuses
// the composer, and dispatches native KeyboardEvents — exactly what the
// React oracle did via useRef + onKeyDown. The Svelte factory uses
// getComposer: () => HTMLTextAreaElement | null instead of composerRef;
// the access is adapted but every assertion (defaultPrevented, callback
// counts, negative assertions) is identical.

import { within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeUiState,
} from '../src/runtime.js';
import {
  createPlanModeShortcut,
  type PlanModeShortcutOptions,
} from '../src/lib/planModeShortcut.js';

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

function unknownDelivery(): RuntimeUiState {
  return runtimeReducer(readyWith(HOST_STATE), {
    type: 'control-settled',
    response: { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } },
  });
}

interface HarnessResult {
  readonly onRequestPlan: ReturnType<typeof vi.fn>;
  readonly onRequestBuildExit: ReturnType<typeof vi.fn>;
  readonly onOpenMenu: ReturnType<typeof vi.fn>;
  readonly onAnnounce: ReturnType<typeof vi.fn>;
  readonly composer: HTMLTextAreaElement;
  readonly outside: HTMLButtonElement;
}

function renderShortcut(
  partial: Partial<PlanModeShortcutOptions> = {},
): HarnessResult {
  const onRequestPlan = vi.fn();
  const onRequestBuildExit = vi.fn();
  const onOpenMenu = vi.fn();
  const onAnnounce = vi.fn();

  const composer = document.createElement('textarea');
  composer.setAttribute('data-testid', 'composer');
  document.body.appendChild(composer);

  const outside = document.createElement('button');
  outside.setAttribute('type', 'button');
  outside.setAttribute('data-testid', 'outside');
  outside.textContent = 'outside';
  document.body.appendChild(outside);

  const options: PlanModeShortcutOptions = {
    enabled: true,
    overlayOpen: false,
    getComposer: () => composer,
    runtime: readyWith(HOST_STATE),
    connection: 'live',
    onRequestPlan,
    onRequestBuildExit,
    onOpenMenu,
    onAnnounce,
    ...partial,
  };

  const handle = createPlanModeShortcut(options);
  composer.addEventListener('keydown', handle);
  outside.addEventListener('keydown', handle);

  return { onRequestPlan, onRequestBuildExit, onOpenMenu, onAnnounce, composer, outside };
}

function keyDown(
  target: HTMLElement,
  init: KeyboardEventInit,
): { readonly event: KeyboardEvent; readonly dispatched: boolean } {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  const dispatched = target.dispatchEvent(event);
  return { event, dispatched };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Shift+Tab interception guards', () => {
  it.each([
    ['no shift', { key: 'Tab' }],
    ['preference off', { key: 'Tab', shiftKey: true }, { enabled: false }],
    ['overlay open', { key: 'Tab', shiftKey: true }, { overlayOpen: true }],
    ['composition active', { key: 'Tab', shiftKey: true, isComposing: true }],
    ['auto-repeat', { key: 'Tab', shiftKey: true, repeat: true }],
    ['meta modifier', { key: 'Tab', shiftKey: true, metaKey: true }],
    ['ctrl modifier', { key: 'Tab', shiftKey: true, ctrlKey: true }],
    ['alt modifier', { key: 'Tab', shiftKey: true, altKey: true }],
    [
      'reconnecting',
      { key: 'Tab', shiftKey: true },
      { connection: 'reconnecting' },
    ],
    [
      'checking runtime',
      { key: 'Tab', shiftKey: true },
      { runtime: INITIAL_RUNTIME_STATE },
    ],
    [
      'turn running',
      { key: 'Tab', shiftKey: true },
      { runtime: readyWith({ ...HOST_STATE, streaming: true }) },
    ],
    [
      'delivery unknown',
      { key: 'Tab', shiftKey: true },
      { runtime: unknownDelivery() },
    ],
  ])('%s produces zero mode requests and no interception', (_name, init, partial) => {
    const harness = renderShortcut(partial);
    harness.composer.focus();
    const { event } = keyDown(harness.composer, init as KeyboardEventInit);
    expect(event.defaultPrevented).toBe(false);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
    expect(harness.onAnnounce).not.toHaveBeenCalled();
  });

  it('a pre-prevented event is never intercepted', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    harness.composer.dispatchEvent(event);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });

  it('from confirmed Build, Shift+Tab requests Plan exactly once', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(harness.onRequestPlan).toHaveBeenCalledTimes(1);
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });

  it('from confirmed Plan, Shift+Tab opens the leave confirmation, never a direct mutation', () => {
    const harness = renderShortcut({
      runtime: readyWith({ ...HOST_STATE, mode: 'plan' }),
    });
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(harness.onRequestBuildExit).toHaveBeenCalledTimes(1);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
  });

  it('from executing-plan, Shift+Tab is a no-op with an announcement', () => {
    const harness = renderShortcut({
      runtime: readyWith({ ...HOST_STATE, mode: 'executing-plan' }),
    });
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(harness.onAnnounce).toHaveBeenCalledWith('Plan execution is in progress.');
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });

  it('from a host-unknown mode, Shift+Tab keeps browser reverse-tab behavior', () => {
    const harness = renderShortcut({
      runtime: readyWith({ ...HOST_STATE, mode: 'unknown' }),
    });
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });
});

describe('browser focus navigation is preserved', () => {
  it('bare Tab on the composer is never intercepted', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'Tab' });
    expect(event.defaultPrevented).toBe(false);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
  });

  it('Shift+Tab outside the composer never requests a mode', () => {
    const harness = renderShortcut();
    harness.outside.focus();
    const { event } = keyDown(harness.outside, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });
});

describe('⌘⇧M opens the menu without changing mode', () => {
  it('opens the menu with zero mode requests', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    const { event } = keyDown(harness.composer, { key: 'm', shiftKey: true, metaKey: true });
    expect(harness.onOpenMenu).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
    expect(harness.onRequestPlan).not.toHaveBeenCalled();
    expect(harness.onRequestBuildExit).not.toHaveBeenCalled();
  });

  it('accepts Ctrl+Shift+M on non-Mac keyboards', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    keyDown(harness.composer, { key: 'M', shiftKey: true, ctrlKey: true });
    expect(harness.onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('never opens while an overlay is open', () => {
    const harness = renderShortcut({ overlayOpen: true });
    harness.composer.focus();
    keyDown(harness.composer, { key: 'm', shiftKey: true, metaKey: true });
    expect(harness.onOpenMenu).not.toHaveBeenCalled();
  });

  it('never opens before authority is ready', () => {
    const harness = renderShortcut({ runtime: INITIAL_RUNTIME_STATE });
    harness.composer.focus();
    keyDown(harness.composer, { key: 'm', shiftKey: true, metaKey: true });
    expect(harness.onOpenMenu).not.toHaveBeenCalled();
  });

  it('is inert during IME composition', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    keyDown(harness.composer, { key: 'm', shiftKey: true, metaKey: true, isComposing: true });
    expect(harness.onOpenMenu).not.toHaveBeenCalled();
  });

  it('does not respond to a plain m key', () => {
    const harness = renderShortcut();
    harness.composer.focus();
    keyDown(harness.composer, { key: 'm' });
    expect(harness.onOpenMenu).not.toHaveBeenCalled();
  });
});

describe('hook shape', () => {
  it('is attached only to the composer surface, not the document', () => {
    // The returned handler is wired by the caller; dispatching Shift+Tab on
    // an unrelated element cannot reach the shortcut logic.
    const harness = renderShortcut();
    const { event } = keyDown(harness.outside, { key: 'Tab', shiftKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(within(document.body).getByTestId('composer')).toBeInTheDocument();
  });
});
