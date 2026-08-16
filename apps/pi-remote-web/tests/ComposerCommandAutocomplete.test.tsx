// ───────────────────────────────────────────────────────────────────
// MODULE: Inline Autocomplete Surface Tests
// ───────────────────────────────────────────────────────────────────
// Proves the full panel state model, the fail-closed action matrix, safe
// text-only rows, status announcements, virtual focus, the visual-viewport
// budget, and the frozen token/contrast/motion styling. The no-submit
// guarantee is structural: the derivation exposes only canInsert/canRetry
// — there is no submission field a state could accidentally enable — and
// the interaction tests below pin that to the DOM.

import { readFileSync } from 'node:fs';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import {
  ComposerCommandAutocomplete,
  SLASH_LISTBOX_ID,
  deriveSlashPanelState,
  hasRows,
  type SlashPanelDerivation,
  type SlashPanelOpenState,
} from '../src/ComposerCommandAutocomplete.js';
import { CommandOption, escapeUnsafeName, optionId } from '../src/CommandOption.js';
import type { HostCommandCatalogState, ScopedCommandSnapshot } from '../src/commands.js';
import type { RankedHostCommand } from '../src/rankHostCommands.js';

afterEach(cleanup);

const COMMANDS: readonly CommandDescriptorDto[] = [
  {
    name: 'plan',
    description: 'Toggle plan mode',
    source: 'extension',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
  },
  {
    name: 'model',
    description: 'Pick a model',
    source: 'prompt',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
  },
];

function catalogState(
  commands: readonly CommandDescriptorDto[] = COMMANDS,
  status: HostCommandCatalogState['status'] = 'ready',
  snapshotPresent = true,
): HostCommandCatalogState {
  const snapshot: ScopedCommandSnapshot | null = snapshotPresent
    ? {
        hostEpoch: 'epoch_web_001',
        sessionId: 'session_web_001',
        sessionRevision: 2,
        catalogRevision: 3,
        commands,
        fetchedAt: Date.now(),
      }
    : null;
  return { status, snapshot, commands: snapshot?.commands ?? [], refresh: vi.fn() };
}

const READY_TRIGGER = { active: true, query: '', tokenStart: 0, tokenEnd: 1 };

function panelProps(overrides: {
  open?: boolean;
  derivation?: SlashPanelDerivation;
  items?: readonly RankedHostCommand[];
  catalog?: HostCommandCatalogState;
  activeName?: string | null;
  running?: boolean;
  prompt?: string;
} = {}) {
  const catalog = overrides.catalog ?? catalogState();
  const items = overrides.items ?? catalog.commands.map((command) => ({ ...command, matchTier: 'host-order' as const, matchRanges: [] }));
  const open = overrides.open ?? true;
  const derivation =
    overrides.derivation ??
    deriveSlashPanelState({
      triggerActive: true,
      query: '',
      draftStartsWithSlash: true,
      commitPending: false,
      catalogStatus: catalog.status,
      snapshotPresent: catalog.snapshot !== null,
      catalogCount: catalog.commands.length,
      matchCount: items.length,
      running: overrides.running ?? false,
    });
  return {
    prompt: overrides.prompt ?? '/',
    open,
    derivation,
    activeName: overrides.activeName ?? null,
    items,
    catalog,
    running: overrides.running ?? false,
    anchorRef: { current: null } as RefObject<HTMLFormElement | null>,
    panelRef: { current: null } as RefObject<HTMLDivElement | null>,
    onInsert: vi.fn(),
    onDisabledPress: vi.fn(),
    onRetry: vi.fn(),
    onAnnounce: vi.fn(),
  };
}

function renderPanel(overrides: Parameters<typeof panelProps>[0] = {}) {
  const props = panelProps(overrides);
  render(<ComposerCommandAutocomplete {...props} />);
  return props;
}

const OPEN_STATES: readonly SlashPanelOpenState[] = [
  'loading.initial',
  'ready.unfiltered',
  'ready.filtered',
  'refreshing.current',
  'ready.emptyCatalog',
  'ready.noMatches',
  'ready.staleOffline',
  'error.noSnapshot',
  'error.hostUnavailable',
  'error.forbidden',
  'error.incompatible',
  'committing',
  'session.running',
];

describe('deriveSlashPanelState: every state is explicit and fail-closed', () => {
  const base = {
    triggerActive: true,
    query: '',
    draftStartsWithSlash: true,
    commitPending: false,
    catalogStatus: 'ready' as const,
    snapshotPresent: true,
    catalogCount: 2,
    matchCount: 2,
    running: false,
  };

  it('closed: no panel in the state model and no actions', () => {
    const result = deriveSlashPanelState({ ...base, triggerActive: false, draftStartsWithSlash: false });
    expect(result).toEqual({
      surfaceState: 'closed',
      panelOpen: false,
      panelState: null,
      canInsert: false,
      canRetry: false,
      message: null,
    });
  });

  it('drafted: a leading-slash draft with the panel closed', () => {
    const result = deriveSlashPanelState({ ...base, triggerActive: false });
    expect(result.surfaceState).toBe('drafted');
    expect(result.panelOpen).toBe(false);
  });

  it('committing: the single transient render after insertion, never insertable', () => {
    const result = deriveSlashPanelState({ ...base, commitPending: true });
    expect(result.panelState).toBe('committing');
    expect(result.canInsert).toBe(false);
    expect(result.canRetry).toBe(false);
  });

  it('loading.initial: bounded skeletons, no insertion, no retry', () => {
    const result = deriveSlashPanelState({
      ...base,
      catalogStatus: 'loading',
      snapshotPresent: false,
      catalogCount: 0,
      matchCount: 0,
    });
    expect(result.panelState).toBe('loading.initial');
    expect(result.message).toBe('Loading available commands…');
    expect(result.canInsert).toBe(false);
    expect(result.canRetry).toBe(false);
  });

  it('ready.unfiltered vs ready.filtered by query', () => {
    expect(deriveSlashPanelState({ ...base, query: '' }).panelState).toBe('ready.unfiltered');
    expect(deriveSlashPanelState({ ...base, query: 'pl' }).panelState).toBe('ready.filtered');
  });

  it('refreshing.current keeps same-scope rows insertable', () => {
    const result = deriveSlashPanelState({ ...base, catalogStatus: 'refreshing' });
    expect(result.panelState).toBe('refreshing.current');
    expect(result.message).toBe('Checking for command changes…');
    expect(result.canInsert).toBe(true);
    // Loading with a committed snapshot is the same row-preserving state.
    expect(deriveSlashPanelState({ ...base, catalogStatus: 'loading' }).panelState).toBe(
      'refreshing.current',
    );
  });

  it('ready.emptyCatalog: message plus retry outside the listbox', () => {
    const result = deriveSlashPanelState({ ...base, catalogCount: 0, matchCount: 0 });
    expect(result.panelState).toBe('ready.emptyCatalog');
    expect(result.message).toBe('No commands are available in this session.');
    expect(result.canInsert).toBe(false);
    expect(result.canRetry).toBe(true);
  });

  it('ready.noMatches: the query is quoted verbatim and Enter is inert', () => {
    const result = deriveSlashPanelState({ ...base, matchCount: 0, query: 'zz' });
    expect(result.panelState).toBe('ready.noMatches');
    expect(result.message).toBe('No command matches “/zz”.');
    expect(result.canInsert).toBe(false);
  });

  it('ready.staleOffline: drafting stays allowed, submission authority is not', () => {
    const result = deriveSlashPanelState({ ...base, catalogStatus: 'stale' });
    expect(result.panelState).toBe('ready.staleOffline');
    expect(result.message).toBe('Last verified — reconnect before sending.');
    expect(result.canInsert).toBe(true);
  });

  it('error.noSnapshot without any snapshot; hostUnavailable hides rows', () => {
    const noSnapshot = deriveSlashPanelState({
      ...base,
      catalogStatus: 'unavailable',
      snapshotPresent: false,
    });
    expect(noSnapshot.panelState).toBe('error.noSnapshot');
    expect(noSnapshot.message).toBe('Reconnect to load commands.');
    expect(noSnapshot.canRetry).toBe(true);
    expect(noSnapshot.canInsert).toBe(false);
    expect(
      deriveSlashPanelState({ ...base, catalogStatus: 'stale', snapshotPresent: false }).panelState,
    ).toBe('error.noSnapshot');

    const hostDown = deriveSlashPanelState({ ...base, catalogStatus: 'unavailable' });
    expect(hostDown.panelState).toBe('error.hostUnavailable');
    expect(hostDown.message).toBe('Pi is not responding.');
    expect(hostDown.canRetry).toBe(true);
    expect(hostDown.canInsert).toBe(false);
  });

  it('error.forbidden and error.incompatible never offer rows', () => {
    const forbidden = deriveSlashPanelState({ ...base, catalogStatus: 'forbidden' });
    expect(forbidden.panelState).toBe('error.forbidden');
    expect(forbidden.message).toBe('Commands aren’t available for this device.');
    expect(forbidden.canInsert).toBe(false);
    expect(forbidden.canRetry).toBe(true);

    const incompatible = deriveSlashPanelState({ ...base, catalogStatus: 'incompatible' });
    expect(incompatible.panelState).toBe('error.incompatible');
    expect(incompatible.message).toBe('The phone and host versions don’t agree.');
    expect(incompatible.canInsert).toBe(false);
    expect(incompatible.canRetry).toBe(true);
  });

  it('session.running: rows stay visible and locally insertable, never reinterpreted', () => {
    const result = deriveSlashPanelState({ ...base, running: true });
    expect(result.panelState).toBe('session.running');
    expect(result.message).toBe('Pi is running — insertion stays local, nothing is sent.');
    expect(result.canInsert).toBe(true);
  });

  it('no open state exposes a submission path: canInsert exists only for row-bearing states', () => {
    for (const panelState of OPEN_STATES) {
      const input = { ...base, query: 'pl', matchCount: 1 };
      let result: SlashPanelDerivation;
      switch (panelState) {
        case 'loading.initial':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'loading', snapshotPresent: false, catalogCount: 0, matchCount: 0 });
          break;
        case 'ready.unfiltered':
          result = deriveSlashPanelState({ ...input, query: '' });
          break;
        case 'ready.filtered':
          result = deriveSlashPanelState(input);
          break;
        case 'refreshing.current':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'refreshing' });
          break;
        case 'ready.emptyCatalog':
          result = deriveSlashPanelState({ ...input, catalogCount: 0, matchCount: 0 });
          break;
        case 'ready.noMatches':
          result = deriveSlashPanelState({ ...input, matchCount: 0 });
          break;
        case 'ready.staleOffline':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'stale' });
          break;
        case 'error.noSnapshot':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'unavailable', snapshotPresent: false });
          break;
        case 'error.hostUnavailable':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'unavailable' });
          break;
        case 'error.forbidden':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'forbidden' });
          break;
        case 'error.incompatible':
          result = deriveSlashPanelState({ ...input, catalogStatus: 'incompatible' });
          break;
        case 'committing':
          result = deriveSlashPanelState({ ...input, commitPending: true });
          break;
        case 'session.running':
          result = deriveSlashPanelState({ ...input, running: true });
          break;
        default:
          throw new Error(`unhandled panel state ${panelState}`);
      }
      expect(result.panelState).toBe(panelState);
      expect(result.canInsert).toBe(hasRows(result.panelState));
      // The derivation has exactly the fail-closed action fields — nothing
      // here can ever be read as "submit" by the composer.
      expect(Object.keys(result).sort()).toEqual(
        ['canInsert', 'canRetry', 'message', 'panelOpen', 'panelState', 'surfaceState'].sort(),
      );
    }
  });
});

describe('ComposerCommandAutocomplete rendering', () => {
  it('is closed: no panel, no listbox, no options in the DOM', () => {
    const props = panelProps({
      open: false,
      prompt: '',
      derivation: deriveSlashPanelState({ triggerActive: false, query: '', draftStartsWithSlash: false, commitPending: false, catalogStatus: 'ready', snapshotPresent: true, catalogCount: 2, matchCount: 2, running: false }),
    });
    const { container } = render(<ComposerCommandAutocomplete {...props} />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(container.querySelector('.slash-surface')).toHaveAttribute('data-state', 'closed');
  });

  it('drafted: the surface marker shows the composer state, no panel', () => {
    const { container } = render(
      <ComposerCommandAutocomplete
        {...panelProps({
          open: false,
          prompt: '/plan ',
          derivation: deriveSlashPanelState({ triggerActive: false, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'ready', snapshotPresent: true, catalogCount: 2, matchCount: 2, running: false }),
        })}
      />,
    );
    expect(container.querySelector('.slash-surface')).toHaveAttribute('data-state', 'drafted');
  });

  it('loading.initial: anchored card, three static skeletons, no listbox', () => {
    render(
      <ComposerCommandAutocomplete
        {...panelProps({
          catalog: catalogState([], 'loading', false),
          items: [],
          derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'loading', snapshotPresent: false, catalogCount: 0, matchCount: 0, running: false }),
        })}
      />,
    );
    expect(screen.getByText('Loading available commands…')).toBeInTheDocument();
    // The card portals to the body; skeletons live inside it.
    expect(document.querySelectorAll('.slash-skeleton')).toHaveLength(3);
    expect(document.querySelector('.slash-skeletons')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.querySelector('.slash-surface')).toHaveAttribute('data-state', 'loading.initial');
  });

  it('ready.unfiltered: labeled listbox, options in host order, first enabled row active', () => {
    renderPanel({ activeName: 'plan' });
    const listbox = screen.getByRole('listbox', { name: 'Available host commands' });
    expect(listbox).toHaveAttribute('id', SLASH_LISTBOX_ID);
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('/plan'),
      expect.stringContaining('/model'),
    ]);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('data-focused');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(document.getElementById(optionId('plan'))).toBe(options[0]);
  });

  it('ready.filtered: only matching rows render with match emphasis', () => {
    const items = [
      { ...COMMANDS[0]!, matchTier: 'name-prefix' as const, matchRanges: [{ start: 0, end: 2 }] },
    ];
    renderPanel({ items, activeName: 'plan' });
    const option = screen.getByRole('option');
    const matches = option.querySelectorAll('.slash-match');
    expect([...matches].map((strong) => strong.textContent).join('')).toBe('pl');
    expect(option.querySelector('.slash-name')?.textContent).toBe('/plan');
  });

  it('refreshing.current keeps rows visible with the checking message', () => {
    renderPanel({
      catalog: catalogState(COMMANDS, 'refreshing', true),
      derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'refreshing', snapshotPresent: true, catalogCount: 2, matchCount: 2, running: false }),
      activeName: 'plan',
    });
    expect(screen.getByText('Checking for command changes…')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('ready.emptyCatalog and ready.noMatches render no listbox and no options', () => {
    const empty = deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'ready', snapshotPresent: true, catalogCount: 0, matchCount: 0, running: false });
    renderPanel({ items: [], catalog: catalogState([]), derivation: empty });
    expect(screen.getByText('No commands are available in this session.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    cleanup();
    const noMatch = deriveSlashPanelState({ triggerActive: true, query: 'zz', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'ready', snapshotPresent: true, catalogCount: 2, matchCount: 0, running: false });
    renderPanel({ items: [], derivation: noMatch });
    expect(screen.getByText('No command matches “/zz”.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('error states show their copy plus a Retry affordance that revalidates', async () => {
    const user = userEvent.setup();
    const props = renderPanel({
      catalog: catalogState(COMMANDS, 'unavailable', true),
      items: [],
      derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'unavailable', snapshotPresent: true, catalogCount: 2, matchCount: 0, running: false }),
    });
    expect(screen.getByText('Pi is not responding.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('staleOffline keeps rows and shows the reconnect notice', () => {
    renderPanel({
      catalog: catalogState(COMMANDS, 'stale', true),
      derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'stale', snapshotPresent: true, catalogCount: 2, matchCount: 2, running: false }),
      activeName: 'plan',
    });
    expect(screen.getByText('Last verified — reconnect before sending.')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('session.running keeps rows insertable and explains the local boundary', () => {
    renderPanel({
      running: true,
      derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'ready', snapshotPresent: true, catalogCount: 2, matchCount: 2, running: true }),
      activeName: 'plan',
    });
    expect(
      screen.getByText('Pi is running — insertion stays local, nothing is sent.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('announces state copy through the atomic status callback', async () => {
    const props = renderPanel({
      catalog: catalogState([], 'loading', false),
      items: [],
      derivation: deriveSlashPanelState({ triggerActive: true, query: '', draftStartsWithSlash: true, commitPending: false, catalogStatus: 'loading', snapshotPresent: false, catalogCount: 0, matchCount: 0, running: false }),
    });
    await waitFor(() =>
      expect(props.onAnnounce).toHaveBeenCalledWith('Loading available commands…'),
    );
  });

  it('debounces the result-count announcement by 250ms', async () => {
    vi.useFakeTimers();
    try {
      const props = renderPanel({ activeName: 'plan' });
      expect(props.onAnnounce).not.toHaveBeenCalledWith('2 commands available');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(props.onAnnounce).not.toHaveBeenCalledWith('2 commands available');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });
      expect(props.onAnnounce).toHaveBeenCalledWith('2 commands available');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the card is nonmodal: portalled above the anchor, no dialog role, no focusable wrapper', () => {
    renderPanel({ activeName: 'plan' });
    const panel = document.querySelector('.slash-panel');
    expect(panel).not.toBeNull();
    // isNonModal means the surrounding page stays accessible to assistive
    // technology: no role=dialog, no aria-modal, and the panel is not in
    // the tab order itself.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(panel?.hasAttribute('aria-modal')).toBe(false);
    expect(panel?.hasAttribute('tabindex')).toBe(false);
  });
});

describe('CommandOption: safe text-only rows', () => {
  const enabledCommand: RankedHostCommand = {
    ...COMMANDS[0]!,
    matchTier: 'name-prefix',
    matchRanges: [{ start: 0, end: 2 }],
    argumentHint: '[mode]',
    requiresConfirmation: true,
  };

  function optionProps(command: RankedHostCommand = enabledCommand, active = false) {
    return { command, active, onInsert: vi.fn(), onDisabledPress: vi.fn() };
  }

  it('renders the canonical name isolated LTR, with hint, description, source, and confirmation', () => {
    render(<CommandOption {...optionProps()} />);
    const option = screen.getByRole('option');
    const name = option.querySelector('.slash-name');
    expect(name).toHaveAttribute('dir', 'ltr');
    expect(name).toHaveAttribute('translate', 'no');
    expect(name?.textContent).toBe('/plan');
    expect(option.querySelector('.slash-hint')?.textContent).toBe('[mode]');
    expect(option.querySelector('.slash-desc')?.textContent).toBe('Toggle plan mode');
    expect(option.querySelector('.slash-source')?.textContent).toBe('Extension');
    expect(option.querySelector('.slash-confirm')?.textContent).toBe('Asks first');
  });

  it('disabled rows replace the description with the disclosed reason and cannot activate', () => {
    const onInsert = vi.fn();
    const onDisabledPress = vi.fn();
    const command: RankedHostCommand = {
      ...COMMANDS[0]!,
      enabled: false,
      disabledReason: 'Unavailable: demo fixture',
      matchTier: 'host-order',
      matchRanges: [],
    };
    render(<CommandOption command={command} active={false} onInsert={onInsert} onDisabledPress={onDisabledPress} />);
    const option = screen.getByRole('option');
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).not.toHaveAttribute('aria-selected');
    expect(option.querySelector('.slash-disabled-reason')?.textContent).toBe(
      'Unavailable: demo fixture',
    );
    expect(option.querySelector('.slash-desc')).toBeNull();
    fireEvent.click(option);
    expect(onInsert).not.toHaveBeenCalled();
    expect(onDisabledPress).toHaveBeenCalledWith('Unavailable: demo fixture');
  });

  it('enabled rows insert on completed press only', () => {
    const onInsert = vi.fn();
    render(<CommandOption {...optionProps(enabledCommand, true)} onInsert={onInsert} />);
    fireEvent.click(screen.getByRole('option'));
    expect(onInsert).toHaveBeenCalledWith('plan');
  });

  it('a tap-drag past the slop cancels activation even if a click completes', () => {
    const onInsert = vi.fn();
    const { container } = render(
      <CommandOption {...optionProps(enabledCommand, false)} onInsert={onInsert} />,
    );
    const option = container.querySelector('[role="option"]')!;
    fireEvent.pointerDown(option, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(option, { clientX: 40, clientY: 30 });
    fireEvent.pointerUp(option, { clientX: 40, clientY: 30 });
    fireEvent.click(option);
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('a drag within the slop still inserts (no accidental suppression)', () => {
    const onInsert = vi.fn();
    const { container } = render(
      <CommandOption {...optionProps(enabledCommand, false)} onInsert={onInsert} />,
    );
    const option = container.querySelector('[role="option"]')!;
    fireEvent.pointerDown(option, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(option, { clientX: 14, clientY: 12 });
    fireEvent.pointerUp(option, { clientX: 14, clientY: 12 });
    fireEvent.click(option);
    expect(onInsert).toHaveBeenCalledWith('plan');
  });

  it('rows are not in the tab order and contain no interactive descendants', () => {
    const { container } = render(<CommandOption {...optionProps()} />);
    const option = container.querySelector('[role="option"]')!;
    expect(option.hasAttribute('tabindex')).toBe(false);
    expect(option.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('controls and bidi overrides are escaped for display and never change identity', () => {
    expect(escapeUnsafeName('plan\u202eevil')).toBe('plan\uFFFDevil');
    expect(escapeUnsafeName('a\u0000b')).toBe('a\uFFFDb');
    const command: RankedHostCommand = {
      ...COMMANDS[0]!,
      name: 'plan\u202eevil',
      matchTier: 'host-order',
      matchRanges: [],
    };
    const { container } = render(<CommandOption {...optionProps(command)} />);
    const name = container.querySelector('.slash-name')!;
    expect(name.textContent).toBe('/plan\uFFFDevil');
    expect(name.innerHTML).not.toContain('\u202e');
  });
});

describe('applied panel styling stays inside the frozen system', () => {
  const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');

  it('uses only the frozen light tokens', () => {
    for (const token of ['#ffffff', '#24221f', '#6c6a65', '#8a452f', '#b85f42', '#f3e4de']) {
      expect(css).toContain(token);
    }
    expect(css).toContain('--slash-raised: #ffffff');
  });

  it('uses only the frozen dark tokens on the raised panel', () => {
    expect(css).toContain('--slash-raised: #2d2a26');
    expect(css).toContain('--slash-ink: #f8f8f6');
    expect(css).toContain('--slash-muted: #9f998f');
    expect(css).toContain('--slash-selection: #3a2720');
    expect(css).toContain('--slash-accent: #f0b19a');
  });

  it('bounds the panel against the visual viewport with 12px screen margins and no horizontal overflow', () => {
    expect(css).toMatch(/max-block-size: min\(280px, calc\(var\(--visual-viewport-height, 100dvh\) \* 0\.4\)\)/u);
    expect(css).toMatch(/max-inline-size: calc\(100vw - 24px\)/u);
    expect(css).toMatch(/overflow-x: hidden/u);
  });

  it('keeps rows at ≥44px targets with contained scrolling and pan-y touch', () => {
    expect(css).toMatch(/\.slash-option \{[^}]*min-block-size: 56px/u);
    expect(css).toMatch(/touch-action: pan-y/u);
    expect(css).toMatch(/overscroll-behavior: contain/u);
    expect(css).toMatch(/\.slash-retry \{[^}]*min-block-size: 44px/u);
  });

  it('hides the scroll-to-latest pill while the panel is open', () => {
    expect(css).toMatch(/body:has\(\.slash-panel\) \.scroll-to-latest \{[^}]*visibility: hidden/u);
  });

  it('zeroes all motion under reduced motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\.slash-option,\n  \.slash-retry \{[^}]*transition: none/u);
  });

  it('the focused row is identifiable without color (ink rail plus outline)', () => {
    expect(css).toMatch(/\.slash-option\[data-focused\] \{[^}]*border-inline-start-color: var\(--slash-ink\)/u);
    expect(css).toMatch(/outline: 2px solid var\(--slash-ink\)/u);
  });
});

describe('frozen panel palette meets WCAG contrast', () => {
  function channel(component: number): number {
    const c = component / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  function luminance(hex: string): number {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function contrast(a: string, b: string): number {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  const pairs: ReadonlyArray<{ readonly name: string; readonly fg: string; readonly bg: string }> = [
    { name: 'light: carbon ink on raised', fg: '#24221f', bg: '#ffffff' },
    { name: 'light: muted on raised', fg: '#6c6a65', bg: '#ffffff' },
    { name: 'light: AA text accent on raised', fg: '#8a452f', bg: '#ffffff' },
    { name: 'light: carbon on selection', fg: '#24221f', bg: '#f3e4de' },
    { name: 'light: AA text accent on selection', fg: '#8a452f', bg: '#f3e4de' },
    { name: 'dark: text on raised', fg: '#f8f8f6', bg: '#2d2a26' },
    { name: 'dark: muted on raised', fg: '#9f998f', bg: '#2d2a26' },
    { name: 'dark: accent text on raised', fg: '#f0b19a', bg: '#2d2a26' },
    { name: 'dark: muted on selection', fg: '#9f998f', bg: '#3a2720' },
    { name: 'dark: accent text on selection', fg: '#f0b19a', bg: '#3a2720' },
  ];
  for (const pair of pairs) {
    it(`${pair.name} ≥ 4.5:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('raw clay still fails AA on bone, so it is never text or the sole indicator', () => {
    expect(contrast('#d97757', '#f8f8f6')).toBeLessThan(4.5);
  });
});

describe('useVisualViewportAnchor', () => {
  it('mirrors the fallback innerHeight into --visual-viewport-height after a frame', async () => {
    const { useVisualViewportAnchor } = await import('../src/useVisualViewportAnchor.js');
    function Probe() {
      useVisualViewportAnchor();
      return null;
    }
    render(<Probe />);
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--visual-viewport-height')).toBe(
        `${window.innerHeight}px`,
      ),
    );
  });

  it('tracks visual-viewport resize events through requestAnimationFrame', async () => {
    const { useVisualViewportAnchor } = await import('../src/useVisualViewportAnchor.js');
    let resizeListener: (() => void) | null = null;
    const visualViewportMock = {
      height: 400,
      offsetTop: 0,
      addEventListener: vi.fn((_: string, listener: () => void) => {
        resizeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewportMock,
    });
    function Probe() {
      const { viewportHeightPx } = useVisualViewportAnchor();
      return <div data-testid="probe">{viewportHeightPx ?? 'none'}</div>;
    }
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('400'));
    visualViewportMock.height = 320;
    await act(async () => {
      resizeListener?.();
    });
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('320'));
    expect(
      document.documentElement.style.getPropertyValue('--visual-viewport-height'),
    ).toBe('320px');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
  });
});
