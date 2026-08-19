// ───────────────────────────────────────────────────────────────────
// MODULE: Session Composer Inline Surface Tests
// ───────────────────────────────────────────────────────────────────
// Proves the composer integration: trigger opening/closing rules, Enter
// and primary-action routing between local Insert and native send, virtual
// focus (textarea keeps DOM focus), IME freezing, the Escape latch, the
// outside-tap dismissal, the `+` mutual exclusion, the no-submit guarantee,
// and the announcement flow through the single atomic status region.

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import { SessionComposer } from '../src/SessionComposer.js';
import {
  AttachmentDraftProvider,
  useAttachmentDraft,
} from '../src/attachments/AttachmentDraftProvider.js';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
  SelectedCommandBinding,
} from '../src/commands.js';
import { INITIAL_RUNTIME_STATE, type RuntimeControls } from '../src/runtime.js';

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

/** A binding that matches the catalogState snapshot exactly. */
const PLAN_BINDING: SelectedCommandBinding = {
  hostEpoch: 'epoch_web_001',
  sessionId: 'session_web_001',
  name: 'plan',
  sessionRevision: 2,
  catalogRevision: 3,
};

function runtimeControls(): RuntimeControls {
  return {
    runtime: INITIAL_RUNTIME_STATE,
    refresh: vi.fn(),
    setModel: vi.fn(),
    setThinkingLevel: vi.fn(),
    setMode: vi.fn(),
  };
}

interface HarnessProps {
  readonly catalog?: HostCommandCatalogState;
  readonly sendPrompt?: ReturnType<typeof vi.fn>;
  readonly sendSlashDraft?: ReturnType<typeof vi.fn>;
  readonly onInsertCommand?: ReturnType<typeof vi.fn>;
  readonly status?: 'idle' | 'running' | 'interrupted' | 'unknown';
  readonly canSubmit?: boolean;
  readonly binding?: SelectedCommandBinding | null;
  readonly slashSubmitting?: boolean;
  readonly runtimeAuthority?: boolean;
  readonly runtimeRunning?: boolean;
  readonly initialPrompt?: string;
  readonly mediaCapability?: { readonly enabled: boolean; readonly imageIn: boolean } | null;
  readonly modelCanViewPhotos?: boolean;
  readonly localFiles?: readonly File[];
}

function Harness({
  catalog = catalogState(),
  sendPrompt = vi.fn(),
  sendSlashDraft = vi.fn(),
  onInsertCommand = vi.fn(),
  status = 'idle',
  canSubmit = true,
  binding: initialBinding = null,
  slashSubmitting = false,
  runtimeAuthority = true,
  runtimeRunning = false,
  initialPrompt = '',
  mediaCapability = null,
  modelCanViewPhotos = true,
  localFiles,
}: HarnessProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [binding, setBinding] = useState<SelectedCommandBinding | null>(initialBinding);
  return (
    <AttachmentDraftProvider capability={mediaCapability} modelCanViewPhotos={modelCanViewPhotos}>
      {localFiles !== undefined && <DraftTestControls files={localFiles} />}
      <SessionComposer
        prompt={prompt}
        setPrompt={(updater) => setPrompt((current) => updater(current))}
        onDraftChange={(value) => setPrompt(value)}
        sendPrompt={sendPrompt}
        sendSlashDraft={sendSlashDraft}
        stopRun={vi.fn()}
        canSubmit={canSubmit}
        status={status}
        connection="live"
        awaitingSnapshot={false}
        sendingPrompt={false}
        stopping={false}
        promptError={null}
        runtimeControls={runtimeControls()}
        catalog={catalog}
        binding={binding}
        slashSubmitting={slashSubmitting}
        runtimeAuthority={runtimeAuthority}
        runtimeRunning={runtimeRunning}
        onInsertCommand={(name, inserted) => {
          setBinding(inserted);
          onInsertCommand(name, inserted);
        }}
        mediaCapability={mediaCapability}
      />
    </AttachmentDraftProvider>
  );
}

function DraftTestControls({ files }: { readonly files: readonly File[] }) {
  const draft = useAttachmentDraft();
  return (
    <button type="button" onClick={() => draft.selectFiles(files)}>
      select local photos
    </button>
  );
}

function renderComposer(props: HarnessProps = {}) {
  const sendPrompt = props.sendPrompt ?? vi.fn();
  const sendSlashDraft = props.sendSlashDraft ?? vi.fn();
  const onInsertCommand = props.onInsertCommand ?? vi.fn();
  const catalog = props.catalog ?? catalogState();
  const result = render(
    <Harness
      {...props}
      catalog={catalog}
      sendPrompt={sendPrompt}
      sendSlashDraft={sendSlashDraft}
      onInsertCommand={onInsertCommand}
    />,
  );
  return { ...result, sendPrompt, sendSlashDraft, onInsertCommand, catalog };
}

/** Type committed text and keep the textarea selection facts in sync. */
async function typeDraft(user: ReturnType<typeof userEvent.setup>, text: string) {
  const composer = screen.getByLabelText('Message Pi');
  await user.type(composer, text);
  fireEvent.select(composer);
  return composer as HTMLTextAreaElement;
}

async function openPanel(user: ReturnType<typeof userEvent.setup>, text = '/') {
  const composer = await typeDraft(user, text);
  const listbox = await screen.findByRole('listbox', { name: 'Available host commands' });
  return { composer: composer as HTMLTextAreaElement, listbox };
}

function optionNames(): readonly string[] {
  return screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.slash-name')?.textContent ?? '');
}

function statusText(): string {
  return screen.getByRole('status').textContent ?? '';
}

/** State copy appears in the panel AND is announced into the status region. */
async function panelCopy(text: string): Promise<void> {
  await screen.findAllByText(text);
}

describe('trigger rules', () => {
  it('opens within one rendered frame for "/" at index zero with host order', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { listbox } = await openPanel(user);
    expect(within(listbox).getAllByRole('option')).toHaveLength(2);
    expect(optionNames()).toEqual(['/plan', '/model']);
    const composer = screen.getByLabelText('Message Pi');
    expect(composer).toHaveAttribute('aria-expanded', 'true');
    expect(composer).toHaveAttribute('aria-controls', 'slash-command-list');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-plan');
    expect(composer).toHaveAttribute('aria-autocomplete', 'list');
  });

  it.each(['hello /', ' /', '/plan args'])('keeps the panel closed for %j', async (text) => {
    const user = userEvent.setup();
    renderComposer();
    await typeDraft(user, text);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Message Pi')).not.toHaveAttribute('aria-expanded');
  });

  it('a slash after a newline does not open', async () => {
    const user = userEvent.setup();
    renderComposer();
    await typeDraft(user, 'hello\n/');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters immediately and locally: no network, description matches cannot outrank name prefixes', async () => {
    const user = userEvent.setup();
    const commands: readonly CommandDescriptorDto[] = [
      ...COMMANDS,
      {
        name: 'deploy',
        description: 'plan the rollout',
        source: 'extension',
        enabled: true,
        disabledReason: null,
        requiresConfirmation: false,
      },
    ];
    const { catalog } = renderComposer({ catalog: catalogState(commands) });
    await typeDraft(user, '/plan');
    expect(optionNames()).toEqual(['/plan', '/deploy']);
    // The empty query keeps host order and the committed catalog is untouched.
    expect(catalog.refresh).not.toHaveBeenCalled();
  });

  it('moving the caret inside the token keeps the panel valid; selecting text closes it', async () => {
    const user = userEvent.setup();
    renderComposer();
    await typeDraft(user, '/plan');
    const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
    // Move the caret back into the token: still open.
    composer.setSelectionRange(2, 2);
    fireEvent.select(composer);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // A non-collapsed selection closes the surface.
    composer.setSelectionRange(0, 2);
    fireEvent.select(composer);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('insertion', () => {
  it('Enter inserts exactly once: canonical token, caret after the space, focus retained, panel closed, no send', async () => {
    const user = userEvent.setup();
    const { sendPrompt, onInsertCommand } = renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Enter}');

    expect(composer.value).toBe('/plan ');
    await waitFor(() => expect(composer.selectionStart).toBe(6));
    expect(composer.selectionEnd).toBe(6);
    expect(document.activeElement).toBe(composer);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert command' })).not.toBeInTheDocument();
    expect(sendPrompt).not.toHaveBeenCalled();
    expect(onInsertCommand).toHaveBeenCalledTimes(1);
    expect(onInsertCommand).toHaveBeenCalledWith('plan', {
      hostEpoch: 'epoch_web_001',
      sessionId: 'session_web_001',
      name: 'plan',
      sessionRevision: 2,
      catalogRevision: 3,
    });
  });

  it('announces "Inserted slash command … Not sent." through the single atomic status region', async () => {
    const user = userEvent.setup();
    renderComposer();
    await openPanel(user);
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('Inserted slash command plan. Not sent.');
  });

  it('tap inserts the same canonical token with the same binding', async () => {
    const user = userEvent.setup();
    const { sendPrompt, onInsertCommand } = renderComposer();
    const { composer } = await openPanel(user);
    await user.click(screen.getByRole('option', { name: /\/model/ }));
    expect(composer.value).toBe('/model ');
    await waitFor(() => expect(composer.selectionStart).toBe(7));
    expect(sendPrompt).not.toHaveBeenCalled();
    expect(onInsertCommand).toHaveBeenCalledWith(
      'model',
      expect.objectContaining({ name: 'model' }),
    );
  });

  it('the primary disc becomes the local Insert action while open and never sends', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer();
    await openPanel(user);
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
    const insert = screen.getByRole('button', { name: 'Insert command' });
    await user.click(insert);
    expect((screen.getByLabelText('Message Pi') as HTMLTextAreaElement).value).toBe('/plan ');
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('the primary disc is disabled when no enabled row is active', async () => {
    const user = userEvent.setup();
    renderComposer();
    await typeDraft(user, '/zz');
    await panelCopy('No command matches “/zz”.');
    expect(screen.getByRole('button', { name: 'Insert command' })).toBeDisabled();
  });

  it('typing after the token then pressing Enter follows the explicit send gate (no double insert)', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/plan ');
    // A second Enter with the panel closed routes the drafted command to the
    // explicit slash lane, never to the ordinary text lane.
    await user.keyboard('{Enter}');
    expect(sendSlashDraft).toHaveBeenCalledTimes(1);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('editing arguments keeps the draft; the panel does not reopen for a caret past the token', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Enter}');
    await user.type(composer, 'careful');
    expect(composer.value).toBe('/plan careful');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(sendSlashDraft).toHaveBeenCalledTimes(1);
    expect(sendPrompt).not.toHaveBeenCalled();
  });
});

describe('explicit slash send gating', () => {
  it('a slash draft without a binding fails closed: disabled Send and a reselection hint', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer();
    const composer = await typeDraft(user, '/plan ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('Choose a command from the list, then send it.');
    expect(composer.value).toBe('/plan ');
    expect(sendSlashDraft).not.toHaveBeenCalled();
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('a bound slash draft sends through the explicit slash lane from the primary action', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer({ binding: PLAN_BINDING });
    const composer = await typeDraft(user, '/plan careful');
    const send = screen.getByRole('button', { name: 'Send command' });
    expect(send).toBeEnabled();
    await user.click(send);
    expect(sendSlashDraft).toHaveBeenCalledTimes(1);
    expect(sendPrompt).not.toHaveBeenCalled();
    // The composer never touches the draft; preservation is the App's job.
    expect(composer.value).toBe('/plan careful');
  });

  it('a running turn disables slash Send, hides Later, and never steers a slash draft', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer({
      status: 'running',
      binding: PLAN_BINDING,
    });
    const composer = await typeDraft(user, '/plan ');
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Later' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Pi is running — commands can be sent after this turn ends.'),
    ).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('Pi is running — commands can be sent after this turn ends.');
    expect(composer.value).toBe('/plan ');
    expect(sendSlashDraft).not.toHaveBeenCalled();
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('disables slash Send when the host runtime snapshot reports streaming', async () => {
    const user = userEvent.setup();
    const { sendSlashDraft } = renderComposer({ runtimeRunning: true, binding: PLAN_BINDING });
    const composer = await typeDraft(user, '/plan ');
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('Pi is running — commands can be sent after this turn ends.');
    expect(composer.value).toBe('/plan ');
    expect(sendSlashDraft).not.toHaveBeenCalled();
  });

  it('missing running-state authority disables slash Send (never guesses)', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer({
      runtimeAuthority: false,
      binding: PLAN_BINDING,
    });
    const composer = await typeDraft(user, '/plan ');
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('Reconnecting to check what can be sent.');
    expect(composer.value).toBe('/plan ');
    expect(sendSlashDraft).not.toHaveBeenCalled();
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('shows bounded revalidation progress and freezes the tray while slashSubmitting', async () => {
    const user = userEvent.setup();
    const { sendSlashDraft } = renderComposer({
      slashSubmitting: true,
      binding: PLAN_BINDING,
      initialPrompt: '/plan ',
    });
    const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
    expect(composer).toHaveValue('/plan ');
    expect(screen.getByText('Checking the command with the relay…')).toBeInTheDocument();
    expect(composer).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(sendSlashDraft).not.toHaveBeenCalled();
  });

  it('keeps ordinary running behavior unchanged: steer and Later, never slash', async () => {
    const user = userEvent.setup();
    const { sendPrompt, sendSlashDraft } = renderComposer({ status: 'running' });
    await typeDraft(user, 'hello');
    const steer = screen.getByRole('button', { name: 'Steer the current turn' });
    await user.click(steer);
    expect(sendPrompt).toHaveBeenCalledWith('steer');
    const later = screen.getByRole('button', { name: 'Later' });
    await user.click(later);
    expect(sendPrompt).toHaveBeenCalledWith('followUp');
    expect(sendSlashDraft).not.toHaveBeenCalled();
  });
});

describe('keyboard navigation', () => {
  it('ArrowDown/ArrowUp move virtual focus through enabled rows without wrapping', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { composer } = await openPanel(user);
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-plan');
    await user.keyboard('{ArrowDown}');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-model');
    await user.keyboard('{ArrowDown}');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-model');
    await user.keyboard('{ArrowUp}');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-plan');
    await user.keyboard('{ArrowUp}');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-plan');
    // DOM focus never leaves the textarea.
    expect(document.activeElement).toBe(composer);
  });

  it('arrows skip disabled rows', async () => {
    const user = userEvent.setup();
    const commands: readonly CommandDescriptorDto[] = [
      { ...COMMANDS[0]!, enabled: false, disabledReason: 'Unavailable: demo' },
      COMMANDS[1]!,
    ];
    renderComposer({ catalog: catalogState(commands) });
    const composer = await typeDraft(user, '/');
    await screen.findByRole('listbox');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-model');
    await user.keyboard('{ArrowUp}');
    expect(composer).toHaveAttribute('aria-activedescendant', 'slash-option-model');
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/model ');
  });

  it('Enter with no active row announces "No command selected." and never sends', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer();
    const { composer } = await openPanel(user);
    await typeDraft(user, 'zz');
    await panelCopy('No command matches “/zz”.');
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('No command selected.');
    expect(composer.value).toBe('/zz');
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('Enter while loading announces no selection and never sends', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer({ catalog: catalogState([], 'loading', false) });
    const composer = await typeDraft(user, '/');
    await panelCopy('Loading available commands…');
    await user.keyboard('{Enter}');
    expect(statusText()).toBe('No command selected.');
    expect(composer.value).toBe('/');
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('Escape closes without editing and latches until the draft or caret changes', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(composer.value).toBe('/');
    expect(document.activeElement).toBe(composer);
    // The exact same draft/caret stays suppressed…
    fireEvent.select(composer);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // …but any draft change reopens the surface.
    await user.type(composer, 'p');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('Escape latch clears when focus leaves and returns', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // Focus leaving and returning re-arms the surface immediately.
    fireEvent.blur(composer);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.focus(composer);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('Shift+Enter inserts a newline and closes the surface', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer();
    const { composer } = await openPanel(user);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(composer.value).toBe('/\n');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('Tab closes the panel and continues normal focus traversal without selecting', async () => {
    const user = userEvent.setup();
    const { onInsertCommand } = renderComposer();
    await openPanel(user);
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onInsertCommand).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByLabelText('Message Pi'));
  });

  it('Left/Right keep native textarea behavior while the panel stays valid', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { composer } = await openPanel(user, '/pl');
    composer.setSelectionRange(2, 2);
    fireEvent.select(composer);
    // The panel never intercepts horizontal caret keys: no preventDefault,
    // no selection clobber, and the panel stays valid for the caret inside
    // the token.
    const keyDown = fireEvent.keyDown(composer, { key: 'ArrowLeft' });
    expect(keyDown).toBe(true);
    expect(composer.selectionStart).toBe(2);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

describe('IME composition', () => {
  it('freezes parsing, insertion, and submission during composition', async () => {
    const user = userEvent.setup();
    const { sendPrompt, onInsertCommand } = renderComposer();
    const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
    fireEvent.focus(composer);
    fireEvent.compositionStart(composer);
    await user.type(composer, '/');
    fireEvent.select(composer);
    // Frozen: no panel, no interception, no insert on Enter. The Enter is
    // dispatched raw because a live IME owns the key (userEvent would
    // simulate the browser's newline default, which real composition does
    // not run).
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(composer, { key: 'Enter' });
    expect(sendPrompt).not.toHaveBeenCalled();
    expect(onInsertCommand).not.toHaveBeenCalled();
    // The guard clears on the next event-loop turn after compositionend.
    await act(async () => {
      fireEvent.compositionEnd(composer);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });
});

describe('dismissal and exclusivity', () => {
  it('outside tap closes the panel and allows the tapped target behavior; re-arms on the textarea', async () => {
    const user = userEvent.setup();
    renderComposer();
    const { composer } = await openPanel(user);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(composer.value).toBe('/');
    // A textarea interaction re-arms the surface.
    await user.click(composer);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('tapping inside the composer tray does not dismiss (the Insert disc stays intact)', async () => {
    const user = userEvent.setup();
    renderComposer();
    await openPanel(user);
    const insert = screen.getByRole('button', { name: 'Insert command' });
    fireEvent.pointerDown(insert);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('the inline panel and the + browser are mutually exclusive in both directions', async () => {
    const user = userEvent.setup();
    renderComposer();
    // Panel open → tapping + closes it and opens the tools browser.
    await openPanel(user);
    await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Insert a command' })).toBeInTheDocument();
    // The gate holds even when the textarea is focused with a live trigger:
    // the browser is open, so the inline surface stays closed.
    const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
    composer.focus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // Tapping the composer closes the browser (its normal dismissal) and the
    // inline surface returns with the same trigger.
    await user.click(composer);
    await waitFor(() =>
      expect(screen.queryByRole('combobox', { name: 'Insert a command' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });
});

describe('catalog lifecycle states', () => {
  it('refreshing keeps rows insertable with the checking message', async () => {
    const user = userEvent.setup();
    renderComposer({ catalog: catalogState(COMMANDS, 'refreshing', true) });
    const composer = await typeDraft(user, '/');
    await panelCopy('Checking for command changes…');
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/plan ');
  });

  it('staleOffline keeps rows for drafting with the reconnect notice', async () => {
    const user = userEvent.setup();
    renderComposer({ catalog: catalogState(COMMANDS, 'stale', true) });
    const composer = await typeDraft(user, '/');
    await panelCopy('Last verified — reconnect before sending.');
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/plan ');
  });

  it('hostUnavailable hides rows and Retry revalidates manually', async () => {
    const user = userEvent.setup();
    const { catalog } = renderComposer({ catalog: catalogState(COMMANDS, 'unavailable', true) });
    await typeDraft(user, '/');
    await panelCopy('Pi is not responding.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(catalog.refresh).toHaveBeenCalledWith('manual');
  });

  it('noSnapshot offers reconnect copy plus Retry', async () => {
    const user = userEvent.setup();
    const { catalog } = renderComposer({ catalog: catalogState([], 'unavailable', false) });
    await typeDraft(user, '/');
    await panelCopy('Reconnect to load commands.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(catalog.refresh).toHaveBeenCalledWith('manual');
  });

  it('forbidden and incompatible show their copy and never rows', async () => {
    const user = userEvent.setup();
    const { unmount } = renderComposer({ catalog: catalogState([], 'forbidden', false) });
    await typeDraft(user, '/');
    await panelCopy('Commands aren’t available for this device.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    unmount();
    cleanup();
    renderComposer({ catalog: catalogState(COMMANDS, 'incompatible', true) });
    await typeDraft(user, '/');
    await panelCopy('The phone and host versions don’t agree.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('empty catalog shows the session message and keeps Enter inert', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer({ catalog: catalogState([], 'ready', true) });
    const composer = await typeDraft(user, '/');
    await panelCopy('No commands are available in this session.');
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/');
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('session.running keeps rows locally insertable and never reinterprets them', async () => {
    const user = userEvent.setup();
    const { sendPrompt } = renderComposer({ status: 'running' });
    const composer = await typeDraft(user, '/');
    await panelCopy('Pi is running — insertion stays local, nothing is sent.');
    await user.keyboard('{Enter}');
    expect(composer.value).toBe('/plan ');
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('no panel interaction ever calls the catalog refresh (open/filter/insert are local)', async () => {
    const user = userEvent.setup();
    const { catalog } = renderComposer();
    await openPanel(user);
    await typeDraft(user, 'pl');
    await user.keyboard('{Enter}');
    expect(catalog.refresh).not.toHaveBeenCalled();
  });
});

describe('accessibility surface', () => {
  it('options are virtual-focus rows: not focusable, announced metadata, no nested controls', async () => {
    const user = userEvent.setup();
    renderComposer();
    await openPanel(user);
    const listbox = screen.getByRole('listbox', { name: 'Available host commands' });
    const options = within(listbox).getAllByRole('option');
    for (const option of options) {
      expect(option.hasAttribute('tabindex')).toBe(false);
      expect(option.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
    }
    expect(options[0]?.textContent).toContain('/plan');
    expect(options[0]?.textContent).toContain('Toggle plan mode');
    expect(options[0]?.textContent).toContain('Extension');
  });

  it('the composer announces through exactly one status region', async () => {
    const user = userEvent.setup();
    renderComposer();
    await openPanel(user);
    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute('aria-atomic', 'true');
  });

  it('a disabled row is deliberately disclosed, never active, and announces its reason on tap', async () => {
    const user = userEvent.setup();
    const commands: readonly CommandDescriptorDto[] = [
      { ...COMMANDS[0]!, enabled: false, disabledReason: 'Unavailable: demo' },
      COMMANDS[1]!,
    ];
    renderComposer({ catalog: catalogState(commands) });
    await openPanel(user);
    const disabled = screen.getByRole('option', { name: /\/plan/ });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    expect(disabled.textContent).toContain('Unavailable: demo');
    await user.click(disabled);
    expect(statusText()).toBe('Unavailable: demo');
    expect((screen.getByLabelText('Message Pi') as HTMLTextAreaElement).value).toBe('/');
  });
});

describe('local photo composer surface', () => {
  const enabled = { enabled: true, imageIn: true } as const;

  it('orders Photo Library and Take Photo before commands and keeps disclosure copy local', async () => {
    const user = userEvent.setup();
    renderComposer({ mediaCapability: enabled });
    await user.click(screen.getByRole('button', { name: 'Add photo, mode, or command' }));

    const library = screen.getByRole('button', { name: 'Photo Library' });
    const take = screen.getByRole('button', { name: 'Take Photo' });
    const commands = screen.getByText('Commands');
    expect(
      library.compareDocumentPosition(commands) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(take.compareDocumentPosition(commands) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByText(
        'Photos stay on this iPhone until Send. Pi and its model provider receive a prepared copy.',
      ),
    ).toBeInTheDocument();
  });

  it('has no photo action or rail when the host capability is off', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
    expect(screen.queryByRole('button', { name: 'Photo Library' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take Photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Draft photos/u })).not.toBeInTheDocument();
  });

  it('does not fetch or open XHR during local selection, preview, or removal', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    const sendPrompt = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    renderComposer({
      mediaCapability: enabled,
      localFiles: [new File(['image'], 'secret.jpg', { type: 'image/jpeg' })],
      sendPrompt,
    });

    await user.click(screen.getByRole('button', { name: 'select local photos' }));
    await user.click(await screen.findByRole('button', { name: 'Preview Photo 1' }));
    await user.click(screen.getByRole('button', { name: 'Close preview' }));
    await user.click(screen.getByRole('button', { name: 'Preview Photo 1' }));
    await user.click(screen.getByRole('button', { name: 'Remove Photo 1' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('secret.jpg')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Message Pi'), 'caption');
    expect(sendPrompt).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(sendPrompt).toHaveBeenCalledOnce();
  });

  it('blocks Send for a locally selected photo when the current model cannot view images', async () => {
    const user = userEvent.setup();
    const sendPrompt = vi.fn();
    renderComposer({
      mediaCapability: enabled,
      modelCanViewPhotos: false,
      localFiles: [new File(['image'], 'blocked.jpg', { type: 'image/png' })],
      sendPrompt,
    });
    await user.click(screen.getByRole('button', { name: 'select local photos' }));
    await waitFor(() =>
      expect(screen.getByText('Current model cannot view photos.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(sendPrompt).not.toHaveBeenCalled();
  });
});
