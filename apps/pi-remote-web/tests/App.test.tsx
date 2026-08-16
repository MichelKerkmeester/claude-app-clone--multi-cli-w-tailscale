// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web App Tests
// ───────────────────────────────────────────────────────────────────

import type {
  ApprovalCardDto,
  AttentionItemDto,
  CommandCatalogDto,
  SessionCardDto,
  TranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const relay = vi.hoisted(() => {
  class CatalogLifecycleError extends Error {
    readonly code: 'unavailable' | 'forbidden' | 'incompatible';

    constructor(code: 'unavailable' | 'forbidden' | 'incompatible') {
      super('catalog lifecycle failure');
      this.name = 'CatalogLifecycleError';
      this.code = code;
    }
  }
  return {
    CatalogLifecycleError,
    createAcceptEditsGrant: vi.fn(),
    decideApproval: vi.fn(),
    fetchApprovals: vi.fn(),
    fetchCommands: vi.fn(),
    fetchRuntimeModels: vi.fn(),
    fetchRuntimeState: vi.fn(),
    fetchTranscript: vi.fn(),
    openSyncSocket: vi.fn(),
    controlRuntime: vi.fn(),
    submitPrompt: vi.fn(),
  };
});

const attention = vi.hoisted(() => ({
  fetchAttention: vi.fn(),
  fetchPushConfig: vi.fn(),
  openAttentionHint: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  updatePushPreferences: vi.fn(),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 180,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 180 })),
    measureElement: () => undefined,
  }),
}));

vi.mock('../src/relay.js', () => relay);
vi.mock('../src/attention.js', () => ({
  ...attention,
  setPushForeground: vi.fn(),
}));

import { AttentionInbox, Home, Review, Session, TranscriptList } from '../src/App.js';
import { EMPTY_TRANSCRIPT, transcriptReducer } from '../src/state.js';

const occurredAt = '2026-08-13T10:00:00.000Z';
const sessionId = 'session_web_001';

const catalogFixture: CommandCatalogDto = {
  hostEpoch: 'epoch_web_001',
  sessionId,
  sessionRevision: 2,
  catalogRevision: 3,
  commands: [
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
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  relay.fetchCommands.mockResolvedValue(catalogFixture);
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
  relay.fetchTranscript.mockResolvedValue({ items: [], coversThrough: 0 });
  relay.fetchRuntimeState.mockResolvedValue({
    sessionId,
    revision: 4,
    model: { provider: 'alpha', id: 'alpha-current', label: 'Alpha Current' },
    thinkingLevel: 'high',
    availableThinkingLevels: ['off', 'high'],
    mode: 'build',
    streaming: false,
    updatedAt: occurredAt,
  });
  relay.fetchRuntimeModels.mockResolvedValue({
    sessionId,
    catalogRevision: 7,
    runtimeRevision: 4,
    currentModel: { provider: 'alpha', id: 'alpha-current', label: 'Alpha Current' },
    streaming: false,
    canSetModelWhileStreaming: false,
    models: [
      { provider: 'alpha', id: 'alpha-current', label: 'Alpha Current' },
      { provider: 'beta', id: 'beta-next', label: 'Beta Next' },
    ],
  });
  relay.openSyncSocket.mockResolvedValue({
    addEventListener: vi.fn(),
    close: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('lists sessions on Home', async () => {
  const sessions: readonly SessionCardDto[] = [
    { id: sessionId, status: 'running', updatedAt: occurredAt, messageCount: 7 },
  ];

  render(
    <Home
      sessions={{
        items: sessions,
        phase: 'ready',
        source: 'relay',
        updatedAt: occurredAt,
        error: null,
      }}
      connection="live"
      cache={null}
      device={{ deviceId: 'device_web_001', hostFingerprint: 'host_web_001' }}
      onSelect={vi.fn()}
      onRevoke={vi.fn()}
      onLogout={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Recent sessions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /session_web_001/i })).toBeInTheDocument();
  await waitFor(() => expect(attention.fetchPushConfig).toHaveBeenCalledOnce());
});

it('opts the installed PWA viewport into safe-area coverage', () => {
  const html = readFileSync('apps/pi-remote-web/index.html', 'utf8');
  expect(html).toMatch(
    /<meta name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover" \/>/u,
  );
});

it('renders every projected transcript block kind', () => {
  const blocks: readonly TranscriptBlock[] = [
    block({ id: 'block_text_001', kind: 'text', text: 'Projected answer', role: 'assistant' }),
    block({ id: 'block_thinking_001', kind: 'thinking', summary: 'Projected reasoning' }),
    block({ id: 'block_plan_001', kind: 'plan', items: [{ text: 'Projected step', done: false }] }),
    block({
      id: 'block_tool_call_001',
      kind: 'tool_call',
      toolName: 'read',
      inputSummary: 'projected input',
    }),
    block({
      id: 'block_tool_result_001',
      kind: 'tool_result',
      toolName: 'read',
      output: 'projected output',
      isError: false,
    }),
    block({
      id: 'block_file_diff_001',
      kind: 'file_diff',
      summary: 'Projected diff',
      patch: '-old\n+new',
    }),
    block({
      id: 'block_usage_001',
      kind: 'usage',
      inputTokens: 120,
      outputTokens: 45,
      cost: 0.02,
    }),
  ];
  const selected = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId });
  const projected = transcriptReducer(selected, {
    type: 'page',
    sessionId,
    coversThrough: blocks.length,
    blocks,
    at: occurredAt,
  });

  render(<TranscriptList blocks={projected.blocks} running={false} />);

  // Assistant text implies its role by placement + serif typography — it no longer carries a
  // "Assistant" header label. Routine evidence (thinking, tool calls/results, usage) groups
  // under an Activity disclosure whose bare children keep their own labels, so a label may
  // appear both as the group summary and an inner header — assert each renders at least once.
  for (const label of [
    'Thinking summary',
    'Plan / todo',
    'Tool call · read',
    'Tool result · read',
    'File diff',
    'Usage',
  ]) {
    expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
  }
  expect(screen.getByText('Projected answer')).toBeInTheDocument();
  expect(screen.getByText('Projected step')).toBeInTheDocument();
  expect(screen.getByText('projected output')).toBeInTheDocument();
});

it('submits the compose box through the relay command path', async () => {
  const user = userEvent.setup();
  const accepted = block({
    id: 'block_prompt_001',
    kind: 'text',
    text: 'Steer safely',
    role: 'user',
  });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({
        ticket: 'ticket_web_001',
        expiresAt: '2099-08-13T10:05:00.000Z',
      }),
    )
    .mockResolvedValueOnce(jsonResponse({ accepted: true, block: accepted }, 202));
  vi.stubGlobal('fetch', fetchMock);
  const actualRelay = await vi.importActual<typeof import('../src/relay.js')>('../src/relay.js');
  relay.submitPrompt.mockImplementation(actualRelay.submitPrompt);
  const dispatchTranscript = vi.fn();

  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={dispatchTranscript}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await user.type(screen.getByLabelText('Message Pi'), 'Steer safely');
  await user.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledOnce());
  expect(relay.submitPrompt).toHaveBeenCalledWith(
    sessionId,
    expect.stringMatching(/^prompt_/u),
    'Steer safely',
    undefined,
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    '/api/auth/ticket',
    expect.objectContaining({ credentials: 'same-origin', method: 'POST' }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    '/api/prompt/submit',
    expect.objectContaining({
      credentials: 'same-origin',
      method: 'POST',
      body: expect.stringContaining('ticket_web_001'),
    }),
  );
  expect(dispatchTranscript).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'promptOptimistic' }),
  );
  expect(dispatchTranscript).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'promptAccepted', block: accepted }),
  );
});

it('prefetches the shared command catalog once for a live session', async () => {
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  // The committed snapshot is fresh, so a foreground return performs no read.
  await act(async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
  });
  expect(relay.fetchCommands).toHaveBeenCalledOnce();
});

it('inserts a command through the + browser without any ticket, prompt, or mutation request', async () => {
  const user = userEvent.setup();
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Insert a command' })).toBeEnabled(),
  );
  await user.click(screen.getByRole('button', { name: 'Show commands' }));
  await user.click(screen.getByRole('option', { name: /plan/ }));

  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  expect(composer.selectionStart).toBe(6);
  expect(relay.submitPrompt).not.toHaveBeenCalled();
  expect(relay.controlRuntime).not.toHaveBeenCalled();
  expect(relay.createAcceptEditsGrant).not.toHaveBeenCalled();
  // Route parity: the + browser produces the exact same "Not sent"
  // announcement as the inline surface.
  expect(await screen.findByText('Inserted slash command plan. Not sent.')).toBeInTheDocument();
});

it('Enter with the inline surface open inserts locally and never submits; the next Enter is the explicit send', async () => {
  const user = userEvent.setup();
  relay.submitPrompt.mockResolvedValue(
    block({ id: 'block_prompt_001', kind: 'text', text: 'ok', role: 'user' }),
  );
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  const listbox = await screen.findByRole('listbox', { name: 'Available host commands' });
  expect(within(listbox).getAllByRole('option')).toHaveLength(2);

  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  await waitFor(() => expect(composer.selectionStart).toBe(6));
  expect(document.activeElement).toBe(composer);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(relay.submitPrompt).not.toHaveBeenCalled();
  // Opening, filtering, and inserting made zero network requests beyond the
  // single prefetched catalog read.
  expect(relay.fetchCommands).toHaveBeenCalledOnce();

  // A second Enter follows the composer's explicit submission policy; the
  // app trims the canonical token before sending.
  await user.keyboard('{Enter}');
  await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledTimes(1));
  expect(relay.submitPrompt).toHaveBeenCalledWith(sessionId, expect.any(String), '/plan', undefined);
});

it('keeps the inline surface closed for every invalid slash trigger', async () => {
  const user = userEvent.setup();
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  const composer = screen.getByLabelText('Message Pi');
  await user.type(composer, 'hello /');
  expect(
    screen.queryByRole('listbox', { name: 'Available host commands' }),
  ).not.toBeInTheDocument();
});

it('the inline panel and the + browser are mutually exclusive', async () => {
  const user = userEvent.setup();
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;

  // Panel open → tapping + closes it and opens the tools browser.
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
  await waitFor(() =>
    expect(screen.queryByRole('listbox', { name: 'Available host commands' })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole('combobox', { name: 'Insert a command' })).toBeInTheDocument();

  // The gate holds even with a live trigger and a focused composer.
  composer.focus();
  expect(
    screen.queryByRole('listbox', { name: 'Available host commands' }),
  ).not.toBeInTheDocument();

  // Tapping the composer dismisses the browser and the inline surface returns.
  await user.click(composer);
  await waitFor(() =>
    expect(screen.queryByRole('combobox', { name: 'Insert a command' })).not.toBeInTheDocument(),
  );
  expect(await screen.findByRole('listbox', { name: 'Available host commands' })).toBeInTheDocument();
});

it('reconciles runtime state when the session returns to the foreground', async () => {
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await waitFor(() => expect(relay.fetchRuntimeModels).toHaveBeenCalledOnce());
  const modelReadsBeforeForeground = relay.fetchRuntimeModels.mock.calls.length;
  const stateReadsBeforeForeground = relay.fetchRuntimeState.mock.calls.length;
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
  await waitFor(() =>
    expect(relay.fetchRuntimeModels.mock.calls.length).toBeGreaterThan(modelReadsBeforeForeground),
  );
  expect(relay.fetchRuntimeState.mock.calls.length).toBeGreaterThan(stateReadsBeforeForeground);
});

it('opens one shared sheet from the header and RuntimeStrip with the correct initial section', async () => {
  const user = userEvent.setup();
  render(
    <Session
      connection="live"
      sessionId={sessionId}
      initialCache={null}
      transcript={{ ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' }}
      dispatchConnection={vi.fn()}
      dispatchTranscript={vi.fn()}
      status="idle"
      onBack={vi.fn()}
    />,
  );

  await waitFor(() => expect(relay.fetchRuntimeModels).toHaveBeenCalledOnce());

  // The header opens the one dialog at the model section.
  await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAttribute('id', 'model-effort-dialog');
  expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);

  await user.click(screen.getByRole('button', { name: 'Close sheet' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  // RuntimeStrip opens the SAME dialog at the effort section.
  await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));
  const effortDialog = await screen.findByRole('dialog');
  expect(effortDialog).toHaveAttribute('id', 'model-effort-dialog');
  expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  const radios = screen.getAllByRole('radio');
  expect(radios.map((radio) => radio.getAttribute('aria-label')?.split(',')[0])).toEqual([
    'Off',
    'High',
  ]);
  expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
});

it('renders a pending approval and submits approve and deny decisions', async () => {
  const user = userEvent.setup();
  const approval: ApprovalCardDto = {
    approvalId: 'approval_web_001',
    sessionId,
    epoch: 'epoch_web_001',
    tool: 'shell',
    canonicalArguments: '{"command":"npm test"}',
    digest: '0123456789abcdef0123456789abcdef',
    policyVersion: 1,
    revision: 1,
    requestedAt: occurredAt,
    expiresAt: '2099-08-13T10:05:00.000Z',
    source: 'explicit',
    status: 'pending',
    reason: null,
  };
  relay.fetchApprovals.mockResolvedValue([approval]);
  relay.decideApproval.mockResolvedValue(undefined);

  render(<Review sessions={[{ id: sessionId }]} onBack={vi.fn()} focusId={null} />);

  expect(await screen.findByText('shell')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Approve once' }));
  await waitFor(() => expect(relay.decideApproval).toHaveBeenCalledWith(approval, 'approve'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Deny' }));
  await waitFor(() => expect(relay.decideApproval).toHaveBeenCalledWith(approval, 'deny'));
});

it('renders the Attention Inbox', async () => {
  const item: AttentionItemDto = {
    lookupId: 'attention_web_001',
    attentionClass: 'needs_input',
    generation: 1,
    nonce: 'nonce_web_001',
    occurredAt,
  };
  attention.fetchAttention.mockResolvedValue([item]);

  render(<AttentionInbox onBack={vi.fn()} onOpen={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Only what needs you' })).toBeInTheDocument();
  expect(await screen.findByText('Needs input')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /open current state/i })).toBeInTheDocument();
});

function block<T extends TranscriptBlock>(value: Omit<T, 'revision' | 'seq' | 'occurredAt'>): T {
  return {
    ...value,
    revision: 1,
    seq: Number(value.id.match(/(\d+)$/u)?.[1] ?? 1),
    occurredAt,
  } as T;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
