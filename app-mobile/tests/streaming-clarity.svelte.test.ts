// ───────────────────────────────────────────────────────────────────
// MODULE: Streaming Clarity Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const relay = vi.hoisted(() => {
  class PromptDeliveryError extends Error {
    readonly outcome: { readonly status: 'accepted' | 'rejected' | 'delivery-unknown' };

    constructor() {
      super('prompt delivery failed');
      this.outcome = { status: 'delivery-unknown' };
    }
  }

  class CatalogLifecycleError extends Error {
    readonly code = 'unavailable';
  }

  class SlashSubmitError extends Error {
    readonly reasonCode = 'command_denied';
  }

  class RelayRequestError extends Error {
    readonly code = 'request_failed';
    readonly status = null;
    readonly retryAfterMs = null;
  }

  class AskQuestionRelayError extends Error {
    readonly reason = 'request_failed';
    readonly status = null;
  }

  class AttachmentTransportError extends Error {
    readonly code = 'request_failed';
    readonly status = null;
  }

  return {
    PromptDeliveryError,
    CatalogLifecycleError,
    SlashSubmitError,
    RelayRequestError,
    AskQuestionRelayError,
    AttachmentTransportError,
    abortPrompt: vi.fn(),
    submitPrompt: vi.fn(),
    submitSlashCommand: vi.fn(),
    submitPromptWithAttachmentRefs: vi.fn(),
    cancelAttachmentSet: vi.fn(),
    fetchAttachmentStatus: vi.fn(),
    reserveAttachmentSet: vi.fn(),
    uploadAttachmentPart: vi.fn(),
    fetchAskQuestionDisplay: vi.fn(),
    requestAskQuestionAnswerTicket: vi.fn(),
    submitAskQuestionAnswer: vi.fn(),
    artifactReadDisplayCode: vi.fn(),
    getRelayHeartbeat: vi.fn(),
    readArtifact: vi.fn(),
    fetchCommands: vi.fn(),
    fetchRuntimeModels: vi.fn(),
    fetchRuntimeState: vi.fn(),
    fetchPlanBinding: vi.fn(),
    fetchTranscript: vi.fn(),
    fetchApprovals: vi.fn(),
    decideApproval: vi.fn(),
    createAcceptEditsGrant: vi.fn(),
    openSyncSocket: vi.fn(),
    controlRuntime: vi.fn(),
    setMode: vi.fn(),
    requestTicket: vi.fn(),
    fetchSessions: vi.fn(),
  };
});

vi.mock('../src/shared/transport/relay.js', () => relay);
vi.mock('../src/shared/state/app-state.svelte.js', () => ({
  getAppActions: () => ({ navigate: vi.fn() }),
  getAppState: () => ({ sessions: { items: [] } }),
}));
vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (next: unknown) => void) => {
      run(value);
      return () => undefined;
    },
  });
  return {
    createVirtualizer: (options: { count?: number }) => {
      let count = options.count ?? 0;
      const api = {
        getTotalSize: () => count * 180,
        getVirtualItems: () =>
          Array.from({ length: count }, (_unused, index) => ({
            index,
            start: index * 180,
            key: index,
          })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => {
          if (typeof next.count === 'number') count = next.count;
        },
      };
      return store(api);
    },
  };
});
vi.mock('../src/pages/chat/artifacts/use-artifact-resource.svelte.js', () => ({
  useArtifactResource: vi.fn(() => ({
    current: { status: 'idle', objectUrl: null, reload: vi.fn(), close: vi.fn() },
  })),
  clearArtifactResourceStore: vi.fn(),
}));

import Session from '../src/pages/chat/screen-chat.svelte';
import RichContentRouter from '../src/pages/chat/rich-content/rich-content-router.svelte';
import RuntimeStatusRegion from '../src/pages/chat/transcript/runtime-status-region.svelte';
import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import { normalizeTranscriptBlocks } from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';
import { INITIAL_RUNTIME_STATE, type RuntimeUiState } from '../src/shared/state/runtime.js';
import { EMPTY_TRANSCRIPT, type DisplayTranscriptBlock } from '../src/shared/state/state.js';
import {
  formatStreamingElapsedLabel,
  hasTranscriptEpochAdvanced,
} from '../src/shared/state/streaming-derivations.js';
import { pruneTranscriptDisclosureState } from '../src/shared/state/transcript-disclosure.svelte.js';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session_streaming_clarity_001';
const AT = '2026-08-17T10:00:00.000Z';
const EPOCH_A = 'epoch_streaming_clarity_a';
const EPOCH_B = 'epoch_streaming_clarity_b';

function thinkingBlock(id = 'block_thinking_clarity_001'): DisplayTranscriptBlock {
  return {
    id,
    revision: 1,
    seq: 1,
    occurredAt: AT,
    kind: 'thinking',
    summary: 'The model is considering the next step.',
    provenance: 'relay',
    richEligible: false,
  } as DisplayTranscriptBlock;
}

function normalizedThinking() {
  const [block] = normalizeTranscriptBlocks({
    sessionId: SESSION_ID,
    blocks: [thinkingBlock() as unknown as TranscriptBlock],
  });
  if (block === undefined) throw new Error('Expected a normalized thinking block.');
  return block;
}

function transcriptState(epoch = EPOCH_A) {
  return {
    ...EMPTY_TRANSCRIPT,
    sessionId: SESSION_ID,
    epoch,
    coversThrough: 1,
    blocks: [thinkingBlock()],
    source: 'relay' as const,
    updatedAt: AT,
  };
}

function runtimeState(): RuntimeUiState {
  return {
    ...INITIAL_RUNTIME_STATE,
    phase: 'ready',
    status: 'ready',
    state: {
      sessionId: SESSION_ID,
      revision: 1,
      model: { provider: 'provider', id: 'model', label: 'Model' },
      thinkingLevel: 'high',
      availableThinkingLevels: ['off', 'high'],
      mode: 'build',
      streaming: false,
      updatedAt: AT,
    },
    models: [
      { provider: 'provider', id: 'model', label: 'Model' },
    ],
  };
}

function renderSession(overrides: Record<string, unknown> = {}) {
  const dispatchTranscript = vi.fn();
  const view = render(Session, {
    props: {
      connection: 'live',
      sessionId: SESSION_ID,
      initialCache: null,
      transcript: transcriptState(),
      dispatchConnection: vi.fn(),
      dispatchTranscript,
      status: 'running',
      onBack: vi.fn(),
      onInbox: vi.fn(),
      onReview: vi.fn(),
      theme: 'system',
      onThemeChange: vi.fn(),
      ...overrides,
    },
  });
  return { view, dispatchTranscript };
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  relay.abortPrompt.mockResolvedValue({ outcome: { status: 'aborted' } });
  relay.fetchCommands.mockResolvedValue({
    hostEpoch: 'host_epoch_streaming_clarity',
    sessionId: SESSION_ID,
    sessionRevision: 1,
    catalogRevision: 1,
    commands: [],
  });
  relay.fetchRuntimeState.mockResolvedValue(runtimeState().state);
  relay.fetchRuntimeModels.mockResolvedValue({
    sessionId: SESSION_ID,
    catalogRevision: 1,
    runtimeRevision: 1,
    currentModel: runtimeState().state?.model ?? null,
    streaming: false,
    canSetModelWhileStreaming: false,
    models: runtimeState().models,
  });
  relay.fetchPlanBinding.mockResolvedValue(null);
  relay.fetchTranscript.mockResolvedValue({ items: [], coversThrough: 0 });
  relay.fetchAskQuestionDisplay.mockResolvedValue(null);
  relay.fetchApprovals.mockResolvedValue({ items: [] });
  relay.fetchSessions.mockResolvedValue({ sessions: [] });
  relay.openSyncSocket.mockResolvedValue({
    addEventListener: vi.fn(),
    close: vi.fn(),
  });
  relay.getRelayHeartbeat.mockResolvedValue({ ok: true });
  relay.requestTicket.mockResolvedValue('ticket_streaming_clarity');
});

afterEach(() => {
  cleanup();
  pruneTranscriptDisclosureState([]);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('thinking presentation', () => {
  it('reaches the thinking prose branch before the generic activity frame', () => {
    const source = readFileSync(
      'app-mobile/src/pages/chat/rich-content/rich-content-router.svelte',
      'utf8',
    );
    const thinkingBranch = source.indexOf(
      "{:else if block.kind === 'activity' && block.sourceBlock.kind === 'thinking'}",
    );
    const activityBranch = source.indexOf("{:else if block.kind === 'activity'}");

    expect(thinkingBranch).toBeGreaterThan(-1);
    expect(activityBranch).toBeGreaterThan(-1);
    expect(thinkingBranch).toBeLessThan(activityBranch);

    const { container } = render(RichContentRouter, {
      props: { block: normalizedThinking() },
    });
    expect(container.querySelector('[data-thinking-prose="true"]')).toHaveTextContent(
      'The model is considering the next step.',
    );
    expect(container.querySelector('.rich-block--frame')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });

  it('opens a thinking row by default while keeping its content as muted prose', async () => {
    const { container } = render(TranscriptList, {
      props: { sessionId: SESSION_ID, blocks: [thinkingBlock()], running: false },
    });

    await waitFor(() => expect(container.querySelector('.tool-fold')).toHaveProperty('open', true));
    expect(container.querySelector('[data-thinking-prose="true"]')).toHaveClass('quiet-copy');
    expect(container.querySelector('.rich-block--frame')).toBeNull();
  });
});

describe('streaming elapsed status', () => {
  it('formats 65 seconds as a padded minute and second pair', () => {
    expect(formatStreamingElapsedLabel(65_000, 0)).toBe('Working — 1:05');
  });

  it('updates the runtime status text from the transcript list clock', async () => {
    vi.useFakeTimers({ now: Date.parse(AT) });
    const runtime = { ...INITIAL_RUNTIME_STATE, ...runtimeState(), phase: 'ready' as const };
    const status = render(RuntimeStatusRegion, { props: { runtime } });
    let elapsedLabel: string | null = null;
    render(TranscriptList, {
      props: {
        sessionId: SESSION_ID,
        blocks: [thinkingBlock()],
        running: true,
        onElapsedLabelChange: (label) => {
          elapsedLabel = label;
        },
      },
    });

    await tick();
    await status.rerender({ runtime, elapsedLabel });
    expect(status.container.querySelector('[data-runtime-announcer="true"]')).toHaveTextContent(
      'Working — 0:00',
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await tick();
    await status.rerender({ runtime, elapsedLabel });
    expect(status.container.querySelector('[data-runtime-announcer="true"]')).toHaveTextContent(
      'Working — 0:01',
    );
  });
});

describe('local stop presentation', () => {
  it('hides running UI after Stop and a bare status flap does not bring it back', async () => {
    const user = userEvent.setup();
    const { view } = renderSession();
    const stop = await screen.findByRole('button', { name: 'Stop the current turn' });
    const announcer = document.querySelector('[data-runtime-announcer="true"]');
    await waitFor(() => expect(announcer).toHaveTextContent(/Working —/u));

    await user.click(stop);
    expect(relay.abortPrompt).toHaveBeenCalledOnce();
    expect(document.querySelector('.streaming--marker')).toBeNull();
    expect(document.querySelector('[data-runtime-announcer="true"]')).not.toHaveTextContent(
      /Working —/u,
    );

    await view.rerender({ status: 'idle' });
    await view.rerender({ status: 'running' });
    expect(document.querySelector('.streaming--marker')).toBeNull();

    await view.rerender({ transcript: transcriptState(EPOCH_B), status: 'running' });
    await waitFor(() => expect(document.querySelector('.streaming--marker')).not.toBeNull());
  });


  it('brings the running UI back for the next turn the person sends', async () => {
    // The relay epoch marks a relay generation, not a turn, so it can stay
    // fixed for a whole session. If Stop only cleared on an epoch change, every
    // turn after the first Stop would run with the indicator, the dots and the
    // announcement dark — for the rest of the session.
    const user = userEvent.setup();
    const { view } = renderSession();
    const stop = await screen.findByRole('button', { name: 'Stop the current turn' });
    await user.click(stop);
    expect(document.querySelector('.streaming--marker')).toBeNull();

    // Same epoch throughout — only the person sending again re-arms it.
    await view.rerender({ status: 'idle' });
    // The send is real, so its transport must resolve or the promise rejects
    // unhandled and fails the run from outside this test.
    relay.submitPrompt.mockResolvedValue({ id: 'block_next', kind: 'text' });
    const composer = screen.getByLabelText('Message Pi');
    await user.type(composer, 'next turn');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await view.rerender({ status: 'running' });

    await waitFor(() => expect(document.querySelector('.streaming--marker')).not.toBeNull());
    expect(document.querySelector('[data-runtime-announcer="true"]')).toHaveTextContent(/Working —/u);
  });


  it('does not carry a stop in one chat into the next chat', async () => {
    // This component instance is reused across chats, and selecting a session
    // empties the transcript to a null epoch. A null on either side is not an
    // epoch advance, so without a session-identity reset the hidden state would
    // follow the person and a live turn would render as if the host had stopped.
    const user = userEvent.setup();
    const { view } = renderSession();
    await user.click(await screen.findByRole('button', { name: 'Stop the current turn' }));
    expect(document.querySelector('.streaming--marker')).toBeNull();

    // Switch chats the way the app does: new id, transcript emptied (null epoch).
    await view.rerender({
      sessionId: 'session_other',
      transcript: { ...EMPTY_TRANSCRIPT, sessionId: 'session_other' },
      status: 'running',
    });
    await waitFor(() => expect(document.querySelector('.streaming--marker')).not.toBeNull());
  });

  it('recognizes only a non-null epoch change as a new turn', () => {
    expect(hasTranscriptEpochAdvanced(EPOCH_A, EPOCH_A)).toBe(false);
    expect(hasTranscriptEpochAdvanced(EPOCH_A, null)).toBe(false);
    expect(hasTranscriptEpochAdvanced(null, EPOCH_B)).toBe(false);
    expect(hasTranscriptEpochAdvanced(EPOCH_A, EPOCH_B)).toBe(true);
  });
});
