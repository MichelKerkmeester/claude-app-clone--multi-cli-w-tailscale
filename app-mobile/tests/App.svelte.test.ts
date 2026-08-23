// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web App Tests (Svelte Port)
// ───────────────────────────────────────────────────────────────────

import type {
  ApprovalCardDto,
  AskQuestionDisplayDto,
  AskQuestionTranscriptMeta,
  AttentionItemDto,
  CommandCatalogDto,
  Envelope,
  SessionCardDto,
  SyncSnapshot,
  TodoProjectionV1,
  TranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
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
  class SlashSubmitError extends Error {
    readonly reasonCode: 'stale_catalog' | 'command_denied';

    constructor(reasonCode: 'stale_catalog' | 'command_denied') {
      super(reasonCode);
      this.name = 'SlashSubmitError';
      this.reasonCode = reasonCode;
    }
  }
  class RelayRequestError extends Error {
    readonly code: 'access_denied' | 'request_failed';
    readonly status: number | null;
    readonly retryAfterMs: number | null;

    constructor(code: 'access_denied' | 'request_failed', status: number | null = null) {
      super(code);
      this.name = 'RelayRequestError';
      this.code = code;
      this.status = status;
      this.retryAfterMs = null;
    }
  }
  return {
    CatalogLifecycleError,
    SlashSubmitError,
    RelayRequestError,
    createAcceptEditsGrant: vi.fn(),
    decideApproval: vi.fn(),
    fetchApprovals: vi.fn(),
    fetchAskQuestionDisplay: vi.fn(),
    fetchCommands: vi.fn(),
    fetchRuntimeModels: vi.fn(),
    fetchRuntimeState: vi.fn(),
    fetchTranscript: vi.fn(),
    openSyncSocket: vi.fn(),
    controlRuntime: vi.fn(),
    requestTicket: vi.fn(),
    submitPrompt: vi.fn(),
    submitSlashCommand: vi.fn(),
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

vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (v: unknown) => void) => {
      run(value);
      return () => {};
    },
  });
  return {
    createVirtualizer: (opts: { count?: number }) => {
      let count = opts?.count ?? 0;
      const api = {
        getTotalSize: () => count * 180,
        getVirtualItems: () =>
          Array.from({ length: count }, (_unused, index) => ({ index, start: index * 180, key: index })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => {
          if (typeof next?.count === 'number') count = next.count;
        },
      };
      return store(api);
    },
  };
});

vi.mock('../src/shared/transport/relay.js', () => relay);
vi.mock('../src/shared/format/attention.js', () => ({
  ...attention,
  setPushForeground: vi.fn(),
}));

import Home from '../src/pages/home/Home.svelte';
import Review from '../src/pages/review/Review.svelte';
import Session from '../src/pages/chat/Chat.svelte';
import AttentionInbox from '../src/pages/inbox/AttentionInbox.svelte';
import TranscriptList from '../src/pages/chat/transcript/TranscriptList.svelte';
import AskQuestionCard from '../src/pages/chat/features/ask-question/AskQuestionCard.svelte';
import {
  EMPTY_TODO_PROJECTION_STATE,
  EMPTY_TRANSCRIPT,
  todoProjectionReducer,
  transcriptReducer,
} from '../src/shared/state/state.js';

const occurredAt = '2026-08-13T10:00:00.000Z';
const sessionId = 'session_web_001';

const askQuestionDisplay: AskQuestionDisplayDto = {
  type: 'session.ask-question.display',
  sessionId,
  questionId: 'question_web_001',
  activityId: 'activity_web_001',
  revision: 2,
  display: {
    prompt: 'Which verification lane should run next?',
    options: [
      { id: 'option_web_tests', label: 'Run focused tests', description: 'Fast local confidence.' },
    ],
    freeText: {
      allowed: true,
      required: false,
      placeholder: 'Optional note',
      maxLength: 120,
    },
    minSelections: 1,
    maxSelections: 1,
  },
  selectionMode: 'single',
  redaction: {
    applied: true,
    policyVersion: 1,
    contentAvailability: 'available',
    redactedFields: [],
  },
  requiresReadOnlyHint: true,
};

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
  // The + tools browser is a bits-ui Popover positioned by floating-ui. Two jsdom
  // gaps keep its content out of the accessibility tree unless shimmed:
  //   1. getBoundingClientRect reports an all-zero box → computePosition can't place it.
  //   2. getClientRects returns an empty list → floating-ui's isReferenceHidden treats
  //      the anchor as hidden, aborts positioning, and never clears visibility:hidden.
  // Give every element a real box (as any browser always has); restored by afterEach.
  const box = {
    width: 200, height: 44, top: 0, left: 0, right: 200, bottom: 44, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box);
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({
    length: 1,
    0: box,
    item: (i: number) => (i === 0 ? box : null),
    [Symbol.iterator]: function* () {
      yield box;
    },
  } as unknown as DOMRectList);

  vi.clearAllMocks();
  relay.fetchCommands.mockResolvedValue(catalogFixture);
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
  relay.fetchTranscript.mockResolvedValue({ items: [], coversThrough: 0 });
  relay.fetchAskQuestionDisplay.mockResolvedValue(askQuestionDisplay);
  relay.requestTicket.mockResolvedValue('ticket_app_001');
  relay.submitSlashCommand.mockResolvedValue(
    block({ id: 'block_slash_001', kind: 'text', text: '/plan', role: 'user' }),
  );
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
  // bits-ui popovers/menus set pointer-events:none on document.body and restore
  // it on a deferred timer that can outlive a test; clear it so the next render
  // starts from a clean pointer-events state.
  document.body.removeAttribute('style');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('lists sessions on Home', async () => {
  const sessions: readonly SessionCardDto[] = [
    { id: sessionId, status: 'running', updatedAt: occurredAt, messageCount: 7 },
  ];

  render(Home, {
    props: {
      sessions: {
        items: sessions,
        phase: 'ready',
        source: 'relay',
        updatedAt: occurredAt,
        error: null,
      },
      connection: 'live',
      cache: null,
      device: { deviceId: 'device_web_001', hostFingerprint: 'host_web_001' },
      onSelect: vi.fn(),
      onRevoke: vi.fn(),
      onLogout: vi.fn(),
    },
  });

  expect(screen.getByRole('heading', { name: 'Recent sessions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /session_web_001/i })).toBeInTheDocument();
  await waitFor(() => expect(attention.fetchPushConfig).toHaveBeenCalledOnce());
});

it('opts the installed PWA viewport into safe-area coverage', () => {
  const html = readFileSync('app-mobile/src/app.html', 'utf8');
  expect(html).toMatch(
    /<meta name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover" \/>/u,
  );
  expect(html).toMatch(/<html lang="en" dir="auto" data-theme="system">/u);
});

it('keeps fonts, manifest, service worker, and push notifications content-free', () => {
  const fontAssets = JSON.parse(
    readFileSync('app-mobile/static/fonts/font-assets.json', 'utf8'),
  ) as { readonly fonts: readonly { readonly family: string; readonly role: string }[] };
  expect(fontAssets.fonts).toEqual([
    expect.objectContaining({ family: 'Source Serif 4', role: 'display' }),
    expect.objectContaining({ family: 'Inter', role: 'ui' }),
  ]);
  expect(fontAssets.fonts).toHaveLength(2);

  const manifest = readFileSync('app-mobile/static/manifest.webmanifest', 'utf8');
  expect(manifest).toContain('content-free attention hints');
  for (const forbidden of ['question-content-canary', 'answer-content-canary', 'ticket_', 'digest']) {
    expect(manifest).not.toContain(forbidden);
  }

  const serviceWorker = readFileSync('app-mobile/static/service-worker.js', 'utf8');
  expect(serviceWorker).toContain("const CACHE_NAME = 'pi-remote-shell-v5';");
  expect(serviceWorker).toContain("if (request.mode === 'navigate')");
  expect(serviceWorker).toContain("cache.put('/index.html', copy)");
  expect(serviceWorker).toContain("cache: 'no-store'");
  expect(serviceWorker).toContain("data: { lookupId: hint.lookupId }");
  expect(serviceWorker).not.toMatch(
    /ask-question|question-content-canary|answer-content-canary|ticket|digest/iu,
  );
  expect(serviceWorker).not.toMatch(/hint\.(prompt|options|answer|ticket|digest)/u);
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
    block({
      id: 'block_attachment_001',
      kind: 'attachment',
      role: 'user',
      mediaKind: 'image',
      ordinal: 1,
      status: 'delivered',
      previewRetained: false,
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

  render(TranscriptList, { props: { blocks: projected.blocks, running: false } });

  for (const label of [
    'Thinking summary',
    'Plan / todo',
    'Tool call · read',
    'Tool result · read',
    'File diff',
    'Usage',
    'Photo attachment',
  ]) {
    expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
  }
  expect(screen.getByText('Projected answer')).toBeInTheDocument();
  expect(screen.getByText('Projected step')).toBeInTheDocument();
  expect(screen.getByText('projected output')).toBeInTheDocument();
  expect(screen.getByText('Preview not retained')).toBeInTheDocument();
  expect(screen.getByText(/without keeping image content/u)).toBeInTheDocument();
});

it('renders a hydrated ask-question block once at its transcript position through Session', async () => {
  const preceding = block({
    id: 'block_question_before_001',
    kind: 'text',
    text: 'Before the question',
    role: 'user',
  });
  const question = block<AskQuestionTranscriptMeta>({
    id: 'block_question_001',
    kind: 'ask-question',
    activityId: askQuestionDisplay.activityId,
    questionId: askQuestionDisplay.questionId,
    sessionId,
    presentedRevision: askQuestionDisplay.revision,
    status: 'presented',
  });
  const following = block({
    id: 'block_question_after_003',
    kind: 'text',
    text: 'After the question',
    role: 'assistant',
  });
  const selected = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId });
  const hydrated = transcriptReducer(selected, {
    type: 'hydrate',
    sessionId,
    epoch: 'epoch_web_001',
    coversThrough: 3,
    blocks: [preceding],
    savedAt: occurredAt,
  });

  const projected = transcriptReducer(hydrated, {
    type: 'page',
    sessionId,
    coversThrough: 3,
    blocks: [preceding, question, following],
    at: occurredAt,
  });

  expect(projected.blocks).toHaveLength(3);
  expect(projected.blocks[1]).toMatchObject({ kind: 'ask-question', id: question.id });

  const { container } = render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: projected,
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
      onInbox: vi.fn(),
      onReview: vi.fn(),
      theme: 'system',
      onThemeChange: vi.fn(),
      askQuestionPrincipal: 'operator@example.test',
    },
  });

  await waitFor(() => expect(container.querySelector('[data-ask-question-card]')).toBeTruthy());
  await waitFor(() =>
    expect(screen.getByText(askQuestionDisplay.display.prompt)).toBeInTheDocument(),
  );
  expect(container.querySelectorAll('[data-ask-question-card]')).toHaveLength(1);
  const content = container.textContent ?? '';
  expect(content.indexOf('Before the question')).toBeLessThan(
    content.indexOf(askQuestionDisplay.display.prompt),
  );
  expect(content.indexOf(askQuestionDisplay.display.prompt)).toBeLessThan(
    content.indexOf('After the question'),
  );
  expect(relay.fetchAskQuestionDisplay).toHaveBeenCalledWith(
    sessionId,
    question.questionId,
    question.presentedRevision,
    expect.any(AbortSignal),
  );
});

it('renders one todo panel at its sync position through the real Session and state path', async () => {
  const before = block({
    id: 'block_todo_before_001',
    kind: 'text',
    text: 'Before the todo projection',
    role: 'user',
  });
  const toolCall = block({
    id: 'block_todo_tool_002',
    kind: 'tool_call',
    toolName: 'read',
    inputSummary: 'read current state',
  });
  const toolResult = block({
    id: 'block_todo_result_005',
    kind: 'tool_result',
    toolName: 'read',
    output: 'current state read',
    isError: false,
  });
  const after = block({
    id: 'block_todo_after_006',
    kind: 'text',
    text: 'After the todo projection',
    role: 'assistant',
  });
  const todoProjection: TodoProjectionV1 = {
    planId: 'plan_app_todos_001',
    source: 'pi',
    revision: 1,
    updatedAt: occurredAt,
    tasks: [
      {
        id: 'task_app_todos_001',
        title: 'Render through Session state',
        state: 'active',
        group: 'Integration',
        order: 1,
        revision: 1,
        updatedAt: occurredAt,
      },
    ],
  };
  const transcriptEnvelopes = [before, toolCall, toolResult, after].map((payload) =>
    syncEnvelope('transcript.block', payload, payload.seq),
  );
  const snapshot: SyncSnapshot = {
    kind: 'sync.snapshot',
    sessionId,
    epoch: 'epoch_web_001',
    coversThrough: 6,
    envelopes: [...transcriptEnvelopes, syncEnvelope('todo.snapshot.v1', todoProjection, 4)],
  };
  const selectedTranscript = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId });
  const transcript = transcriptReducer(selectedTranscript, {
    type: 'snapshot',
    message: snapshot,
    at: occurredAt,
  });
  const selectedTodo = todoProjectionReducer(EMPTY_TODO_PROJECTION_STATE, {
    type: 'select',
    sessionId,
  });
  const todo = todoProjectionReducer(selectedTodo, { type: 'snapshot', message: snapshot });

  const { container } = render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript,
      todoProjection: todo,
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      dispatchTodoProjection: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
      onInbox: vi.fn(),
      onReview: vi.fn(),
      theme: 'system',
      onThemeChange: vi.fn(),
    },
  });

  expect(container.querySelectorAll('[data-todo-projection-block]')).toHaveLength(1);
  expect(screen.getByText('Render through Session state')).toBeInTheDocument();
  const content = container.textContent ?? '';
  expect(content.indexOf('Before the todo projection')).toBeLessThan(
    content.indexOf('Render through Session state'),
  );
  expect(content.indexOf('Render through Session state')).toBeLessThan(
    content.indexOf('current state read'),
  );
  expect(content.indexOf('Render through Session state')).toBeLessThan(
    content.indexOf('After the todo projection'),
  );

  const activityTrigger = screen.getByRole('button', { name: /Worked · 1 tool/u });
  await userEvent.click(activityTrigger);
  expect(activityTrigger).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(activityTrigger);
  expect(activityTrigger).toHaveAttribute('aria-expanded', 'false');
  expect(container.querySelectorAll('[data-todo-projection-block]')).toHaveLength(1);
  expect(screen.getByText('Render through Session state')).toBeVisible();
  expect(
    container
      .querySelector('.activity-group')
      ?.contains(container.querySelector('[data-todo-panel]')),
  ).toBe(false);

  await userEvent.click(screen.getByRole('button', { name: 'Refresh pi todos' }));
  await waitFor(() => expect(relay.openSyncSocket).toHaveBeenCalledTimes(2));
  expect(relay.submitPrompt).not.toHaveBeenCalled();
  expect(relay.submitSlashCommand).not.toHaveBeenCalled();
});

it('exposes safe ask-question semantics and follows the card-local answer-stop sequence', async () => {
  const user = userEvent.setup();
  const navigationDisplay: AskQuestionDisplayDto = {
    ...askQuestionDisplay,
    display: {
      ...askQuestionDisplay.display,
      options: [
        { id: 'option_web_tests', label: 'Run focused tests', description: 'Fast local confidence.' },
        { id: 'option_web_review', label: 'Run the review lane', description: 'Check the release boundary.' },
      ],
      minSelections: 1,
      maxSelections: 2,
    },
    selectionMode: 'multiple',
  };
  relay.fetchAskQuestionDisplay.mockResolvedValue(navigationDisplay);
  const question = block<AskQuestionTranscriptMeta>({
    id: 'block_access_question_001',
    kind: 'ask-question',
    activityId: navigationDisplay.activityId,
    questionId: navigationDisplay.questionId,
    sessionId,
    presentedRevision: navigationDisplay.revision,
    status: 'presented',
  });

  render(AskQuestionCard, { props: { block: question, principal: 'operator@example.test' } });

  const region = await screen.findByRole('region', { name: navigationDisplay.display.prompt });
  const first = screen.getByRole('button', { name: 'Run focused tests' });
  const second = screen.getByRole('button', { name: 'Run the review lane' });
  const textarea = screen.getByPlaceholderText('Optional note');
  expect(screen.getByRole('group', { name: 'Answer options' })).toBeInTheDocument();
  expect(first).toHaveAttribute('aria-pressed', 'false');
  expect(second).toHaveAttribute('aria-pressed', 'false');
  expect(first).toHaveAttribute('aria-describedby');
  expect(
    document.getElementById(first.getAttribute('aria-describedby') ?? '')?.textContent,
  ).toContain('Fast local confidence.');
  expect(textarea).toHaveAttribute('aria-required', 'false');
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  expect(region).toHaveAttribute('aria-busy', 'false');

  await waitFor(() => expect(first).toHaveAttribute('tabindex', '0'));
  expect(second).toHaveAttribute('tabindex', '-1');
  expect(document.activeElement).toBe(first);
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(second);
  expect(second).toHaveAttribute('aria-pressed', 'false');
  await user.keyboard('{Home}');
  expect(document.activeElement).toBe(first);
  await user.keyboard('{End}');
  expect(document.activeElement).toBe(second);
  await user.keyboard('{Tab}');
  expect(document.activeElement).toBe(textarea);
  await user.keyboard('{Shift>}{Tab}{/Shift}');
  expect(document.activeElement).toBe(second);
  await user.click(first);
  expect(first).toHaveAttribute('aria-pressed', 'true');
  expect(within(first).getByText('✓')).toBeInTheDocument();
  expect(relay.requestTicket).not.toHaveBeenCalled();
});

it('preserves long translated order and safe error associations under RTL and large text', async () => {
  const user = userEvent.setup();
  const root = document.documentElement;
  const previousDirection = root.getAttribute('dir');
  const previousFontSize = root.style.fontSize;
  root.setAttribute('dir', 'rtl');
  root.style.fontSize = '200%';
  const longDisplay: AskQuestionDisplayDto = {
    ...askQuestionDisplay,
    display: {
      ...askQuestionDisplay.display,
      prompt: 'Choose the answer that remains readable at large text sizes.',
      options: [
        {
          id: 'option_long_001',
          label:
            'An exceptionally long translated answer label that must wrap naturally without being truncated',
          description: 'Its description also remains available to assistive technology.',
        },
      ],
      freeText: {
        allowed: true,
        required: true,
        placeholder: 'Required response',
        maxLength: 120,
      },
      minSelections: 1,
      maxSelections: 1,
    },
    selectionMode: 'single',
  };
  relay.fetchAskQuestionDisplay.mockResolvedValue(longDisplay);
  const question = block<AskQuestionTranscriptMeta>({
    id: 'block_rtl_question_001',
    kind: 'ask-question',
    activityId: longDisplay.activityId,
    questionId: longDisplay.questionId,
    sessionId,
    presentedRevision: longDisplay.revision,
    status: 'presented',
  });

  try {
    render(AskQuestionCard, { props: { block: question, principal: 'operator@example.test' } });
    const region = await screen.findByRole('region', { name: longDisplay.display.prompt });
    const option = screen.getByRole('button', {
      name: longDisplay.display.options[0]?.label,
    });
    const textarea = screen.getByPlaceholderText('Required response');
    expect(root).toHaveAttribute('dir', 'rtl');
    expect(option.textContent).toContain(longDisplay.display.options[0]?.label);
    expect(
      [...region.querySelectorAll('.ask-question-option-row')].map((row) => row.textContent),
    ).toEqual([expect.stringContaining('exceptionally long translated answer label')]);

    await user.type(textarea, ' ');
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Select at least one option.');
    expect(textarea).toHaveAttribute('aria-errormessage', error.id);
    expect(textarea.getAttribute('aria-describedby')).toContain(error.id);
  } finally {
    if (previousDirection === null) root.removeAttribute('dir');
    else root.setAttribute('dir', previousDirection);
    root.style.fontSize = previousFontSize;
  }
});

it('does not steal unrelated focus, preserves IME entry, and focuses the safe terminal state', async () => {
  const user = userEvent.setup();
  const external = document.createElement('button');
  external.type = 'button';
  external.textContent = 'Transcript control';
  document.body.append(external);
  external.focus();
  const question = block<AskQuestionTranscriptMeta>({
    id: 'block_focus_question_001',
    kind: 'ask-question',
    activityId: askQuestionDisplay.activityId,
    questionId: askQuestionDisplay.questionId,
    sessionId,
    presentedRevision: askQuestionDisplay.revision,
    status: 'presented',
  });

  const { rerender } = render(AskQuestionCard, {
    props: { block: question, principal: 'operator@example.test' },
  });
  const textarea = await screen.findByPlaceholderText('Optional note');
  expect(document.activeElement).toBe(external);

  textarea.focus();
  fireEvent.compositionStart(textarea);
  fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', isComposing: true });
  fireEvent.compositionEnd(textarea);
  await user.type(textarea, '日本語の回答');
  expect(textarea).toHaveValue('日本語の回答');
  expect(relay.requestTicket).not.toHaveBeenCalled();

  const option = screen.getByRole('button', { name: 'Run focused tests' });
  option.focus();
  const expired = { ...question, status: 'expired' as const };
  await rerender({ block: expired });
  const region = await screen.findByRole('region', { name: askQuestionDisplay.display.prompt });
  await waitFor(() => expect(screen.getByText('This question is no longer available.')).toBeInTheDocument());
  expect(region).toHaveAttribute('data-ask-question-phase', 'expired');
  expect(document.activeElement).toBe(region);
  external.remove();
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
  const actualRelay = await vi.importActual<typeof import('../src/shared/transport/relay.js')>('../src/shared/transport/relay.js');
  relay.submitPrompt.mockImplementation(actualRelay.submitPrompt);
  const dispatchTranscript = vi.fn();

  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript,
      status: 'idle',
      onBack: vi.fn(),
    },
  });

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
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  // The committed snapshot is fresh, so a foreground return performs no read.
  await act(() => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(relay.fetchCommands).toHaveBeenCalledOnce();
});

it('inserts a command through the + browser without any ticket, prompt, or mutation request', async () => {
  const user = userEvent.setup();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Insert a command' })).toBeEnabled(),
  );
  expect(screen.queryByRole('button', { name: 'Photo Library' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Take Photo' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Insert a command' }));
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

it('renders the fixture-gated photo group only when image input is advertised', async () => {
  const user = userEvent.setup();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
      onInbox: vi.fn(),
      onReview: vi.fn(),
      theme: 'system',
      onThemeChange: vi.fn(),
      mediaCapability: { enabled: true, imageIn: true },
    },
  });

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Add photo, mode, or command' }));
  expect(await screen.findByRole('button', { name: 'Photo Library' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Take Photo' })).toBeInTheDocument();
});

it('Enter with the inline surface open inserts locally and never submits; the next Enter is the explicit slash send', async () => {
  const user = userEvent.setup();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });

  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  // The slash lane only opens with host-confirmed running/plan authority.
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Build' })).toBeEnabled());
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
  expect(relay.requestTicket).not.toHaveBeenCalled();
  // Opening, filtering, and inserting made zero network requests beyond the
  // single prefetched catalog read.
  expect(relay.fetchCommands).toHaveBeenCalledOnce();

  // A second Enter follows the explicit submission policy: the drafted
  // command goes through the ticketed slash lane with the current binding —
  // one fresh ticket and one expected-revision envelope, never the text lane.
  await user.keyboard('{Enter}');
  await waitFor(() => expect(relay.requestTicket).toHaveBeenCalledTimes(1));
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  expect(relay.submitSlashCommand).toHaveBeenCalledWith(
    sessionId,
    expect.stringMatching(/^slash_/u),
    '/plan',
    {
      hostEpoch: 'epoch_web_001',
      sessionId,
      name: 'plan',
      sessionRevision: 2,
      catalogRevision: 3,
    },
    undefined,
  );
  expect(relay.submitPrompt).not.toHaveBeenCalled();
});

it('sends a drafted slash command exactly once and reconciles only after acceptance', async () => {
  const user = userEvent.setup();
  const dispatchTranscript = vi.fn();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript,
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getAllByText('Alpha Current').length).toBeGreaterThan(0));
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  await user.keyboard('{Enter}');

  await waitFor(() => expect(relay.requestTicket).toHaveBeenCalledTimes(1));
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  expect(relay.submitPrompt).not.toHaveBeenCalled();
  // Optimistic transcript behavior applies only after acceptance: the
  // authoritative block lands directly and the draft clears.
  await waitFor(() =>
    expect(dispatchTranscript).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'promptAccepted', sessionId }),
    ),
  );
  expect(dispatchTranscript).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: 'promptOptimistic' }),
  );
  await waitFor(() => expect(composer).toHaveValue(''));
});

it('a stale race preserves the draft, clears the binding, refreshes the catalog, and never retries', async () => {
  const user = userEvent.setup();
  relay.submitSlashCommand.mockRejectedValueOnce(new relay.SlashSubmitError('stale_catalog'));
  const dispatchTranscript = vi.fn();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript,
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getAllByText('Alpha Current').length).toBeGreaterThan(0));
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  await user.keyboard('{Enter}');

  await waitFor(() => expect(relay.requestTicket).toHaveBeenCalledTimes(1));
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  // The draft survives the race…
  expect(composer).toHaveValue('/plan ');
  // …the catalog is refreshed for reselection…
  await waitFor(() => expect(relay.fetchCommands.mock.calls.length).toBeGreaterThan(1));
  expect(
    await screen.findByText('Commands changed on the host. Choose the command again.'),
  ).toBeInTheDocument();
  expect(dispatchTranscript).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: 'promptAccepted' }),
  );
  // …and no retry is possible: the unsafe binding is gone, so the next
  // Enter cannot re-submit anything.
  await user.keyboard('{Enter}');
  expect(relay.requestTicket).toHaveBeenCalledTimes(1);
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  expect(relay.submitPrompt).not.toHaveBeenCalled();
});

it('a denied command preserves the draft and never retries or falls back to text', async () => {
  const user = userEvent.setup();
  relay.submitSlashCommand.mockRejectedValueOnce(new relay.SlashSubmitError('command_denied'));
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getAllByText('Alpha Current').length).toBeGreaterThan(0));
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  await user.keyboard('{Enter}');

  await waitFor(() => expect(relay.requestTicket).toHaveBeenCalledTimes(1));
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  expect(composer).toHaveValue('/plan ');
  expect(
    await screen.findByText('That command is not available right now. Choose it again to retry.'),
  ).toBeInTheDocument();
  // Denied outcomes do not refresh the catalog and are never retried or
  // converted to the ordinary text lane.
  const readsAfterDenial = relay.fetchCommands.mock.calls.length;
  await user.keyboard('{Enter}');
  expect(relay.requestTicket).toHaveBeenCalledTimes(1);
  expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  expect(relay.submitPrompt).not.toHaveBeenCalled();
  expect(relay.fetchCommands.mock.calls.length).toBe(readsAfterDenial);
});

it('a running turn never steers a slash draft; ordinary text still steers', async () => {
  const user = userEvent.setup();
  relay.fetchRuntimeState.mockResolvedValue({
    sessionId,
    revision: 4,
    model: { provider: 'alpha', id: 'alpha-current', label: 'Alpha Current' },
    thinkingLevel: 'high',
    availableThinkingLevels: ['off', 'high'],
    mode: 'build',
    streaming: true,
    updatedAt: occurredAt,
  });
  relay.submitPrompt.mockResolvedValue(
    block({ id: 'block_prompt_001', kind: 'text', text: 'ok', role: 'user' }),
  );
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'running',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getAllByText('Alpha Current').length).toBeGreaterThan(0));
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  // Ordinary text keeps the unchanged steer path while running.
  await user.type(composer, 'hello');
  await user.click(screen.getByRole('button', { name: 'Steer the current turn' }));
  await waitFor(() =>
    expect(relay.submitPrompt).toHaveBeenCalledWith(
      sessionId,
      expect.stringMatching(/^prompt_/u),
      'hello',
      'steer',
    ),
  );
  // The slash draft inserts locally, but Send is disabled while running and
  // the Later conversion is absent.
  await user.clear(composer);
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Later' })).not.toBeInTheDocument();
  await user.keyboard('{Enter}');
  expect(relay.requestTicket).not.toHaveBeenCalled();
  expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  expect(relay.submitPrompt).toHaveBeenCalledTimes(1);
});

it('missing running-state authority disables slash Send (never guesses)', async () => {
  const user = userEvent.setup();
  relay.fetchRuntimeState.mockRejectedValue(new Error('relay unreachable'));
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(relay.fetchRuntimeState).toHaveBeenCalled());
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));
  expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
  await user.keyboard('{Enter}');
  expect(relay.requestTicket).not.toHaveBeenCalled();
  expect(relay.submitSlashCommand).not.toHaveBeenCalled();
});

it('a session switch clears the binding: no cross-session slash submit', async () => {
  const user = userEvent.setup();
  const { rerender } = render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getAllByText('Alpha Current').length).toBeGreaterThan(0));
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.keyboard('{Enter}');
  await waitFor(() => expect(composer).toHaveValue('/plan '));

  await rerender({
    sessionId: 'session_other',
    transcript: { ...EMPTY_TRANSCRIPT, sessionId: 'session_other', source: 'none' },
  });
  // The drafted token survives, but the binding cannot survive the switch:
  // Send is fail-closed and nothing reaches the relay.
  expect(screen.getByRole('button', { name: 'Send command' })).toBeDisabled();
  await user.keyboard('{Enter}');
  expect(relay.requestTicket).not.toHaveBeenCalled();
  expect(relay.submitSlashCommand).not.toHaveBeenCalled();
});

it('keeps the inline surface closed for every invalid slash trigger', async () => {
  const user = userEvent.setup();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  const composer = screen.getByLabelText('Message Pi');
  await user.type(composer, 'hello /');
  expect(
    screen.queryByRole('listbox', { name: 'Available host commands' }),
  ).not.toBeInTheDocument();
});

// Skipped under jsdom because Bits UI interact-outside dismissal is not simulable there.
// The real behavior is exercised by the CDP gate. This mirrors the existing
// SessionComposer skip for the same reason.
it.skip('the inline panel and the + browser are mutually exclusive', async () => {
  const user = userEvent.setup();
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });
  await waitFor(() => expect(relay.fetchCommands).toHaveBeenCalledOnce());
  const composer = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;

  // Panel open → tapping + closes it and opens the tools browser.
  await user.type(composer, '/');
  await screen.findByRole('listbox', { name: 'Available host commands' });
  await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('listbox', { name: 'Available host commands' }),
    ).not.toBeInTheDocument(),
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
  expect(
    await screen.findByRole('listbox', { name: 'Available host commands' }),
  ).toBeInTheDocument();
});

it('reconciles runtime state when the session returns to the foreground', async () => {
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });

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
  render(Session, {
    props: {
      connection: 'live',
      sessionId,
      initialCache: null,
      transcript: { ...EMPTY_TRANSCRIPT, sessionId, epoch: 'epoch_web_001', source: 'relay' },
      dispatchConnection: vi.fn(),
      dispatchTranscript: vi.fn(),
      status: 'idle',
      onBack: vi.fn(),
    },
  });

  await waitFor(() => expect(relay.fetchRuntimeModels).toHaveBeenCalledOnce());

  // The header opens the one dialog at the model section.
  const modelButton = await screen.findByRole('button', { name: /Model, Alpha Current, alpha/ });
  await user.click(modelButton);
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAttribute('id', 'model-effort-dialog');
  expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);

  await user.click(screen.getByRole('button', { name: 'Close sheet' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  // bits-ui may leave pointer-events:none on document.body after closing the dialog.
  document.body.removeAttribute('style');

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

  render(Review, { props: { sessions: [{ id: sessionId }], onBack: vi.fn(), focusId: null } });

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

  render(AttentionInbox, { props: { onBack: vi.fn(), onOpen: vi.fn() } });

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

function syncEnvelope(kind: string, payload: Envelope['payload'], seq: number): Envelope {
  return {
    v: 1,
    eventId: `event_web_${seq}`,
    kind,
    hostId: 'host_web_001',
    workspaceRef: 'workspace_web_001',
    sessionId,
    epoch: 'epoch_web_001',
    seq,
    occurredAt,
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}