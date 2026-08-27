// ───────────────────────────────────────────────────────────────────
// MODULE: Session Prompt Delivery Hold + Draft Park Tests (Svelte)
// ───────────────────────────────────────────────────────────────────

// Renders the real Session screen with the relay transport mocked, and
// proves the two delivery lanes for a thrown send: a lost ack whose turn
// lands must not restore the draft or invite a resend, while a send that
// truly failed restores the exact raw draft (whitespace intact) and reuses
// the same submissionId on retry. Also proves the raw draft parks across
// leaving and re-entering the session, and degrades to an empty draft on
// storage failure instead of surfacing an error.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ───────────────────────────────────────────────────────────────────
// 2. RELAY MOCK (PromptDeliveryError must be the real class: the screen
//    classifies the failure lane via instanceof)
// ───────────────────────────────────────────────────────────────────

const relay = vi.hoisted(() => {
  class PromptDeliveryError extends Error {
    readonly outcome;

    constructor(
      outcome: { status: 'accepted' | 'rejected' | 'delivery-unknown'; reasonCode: string },
      message: string,
    ) {
      super(message);
      this.name = 'PromptDeliveryError';
      this.outcome = outcome;
    }
  }
  class CatalogLifecycleError extends Error {
    readonly code: string;
    constructor(code: string) {
      super('catalog lifecycle failure');
      this.name = 'CatalogLifecycleError';
      this.code = code;
    }
  }
  class SlashSubmitError extends Error {
    readonly reasonCode: string;
    constructor(reasonCode: string) {
      super(reasonCode);
      this.name = 'SlashSubmitError';
      this.reasonCode = reasonCode;
    }
  }
  class RelayRequestError extends Error {
    readonly code: string;
    readonly status: number | null;
    readonly retryAfterMs: number | null;
    constructor(code: string, status: number | null = null) {
      super(code);
      this.name = 'RelayRequestError';
      this.code = code;
      this.status = status;
      this.retryAfterMs = null;
    }
  }
  class AskQuestionRelayError extends Error {
    readonly reason: string;
    readonly status: number | null;
    constructor(reason: string, status: number | null = null) {
      super('Ask-question request failed.');
      this.name = 'AskQuestionRelayError';
      this.reason = reason;
      this.status = status;
    }
  }
  class AttachmentTransportError extends Error {
    constructor(
      readonly code: string,
      readonly status: number | null = null,
    ) {
      super('Attachment transfer failed.');
      this.name = 'AttachmentTransportError';
    }
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
    fetchTranscript: vi.fn(),
    fetchApprovals: vi.fn(),
    decideApproval: vi.fn(),
    createAcceptEditsGrant: vi.fn(),
    openSyncSocket: vi.fn(),
    controlRuntime: vi.fn(),
    requestTicket: vi.fn(),
    fetchSessions: vi.fn(),
  };
});

vi.mock('../src/shared/transport/relay.js', () => relay);

import { readParkedDraftText } from '../src/shared/state/chat-draft-cache.js';
import Session from '../src/pages/chat/screen-chat.svelte';
import { EMPTY_TRANSCRIPT } from '../src/shared/state/state.js';
import { clearChatDraftCache, parkDraftText } from '../src/shared/state/chat-draft-cache.js';

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Mount-path relay calls must resolve: the screen's effects call .then on
  // each of these, and a bare vi.fn() returns undefined.
  relay.abortPrompt.mockResolvedValue({ outcome: { status: 'aborted' } });
  relay.fetchTranscript.mockResolvedValue({ items: [], coversThrough: 0 });
  relay.fetchCommands.mockResolvedValue({
    hostEpoch: 'epoch_hold_001',
    sessionId: 'session_hold_001',
    sessionRevision: 1,
    catalogRevision: 1,
    commands: [],
    fetchedAt: 0,
  });
  relay.fetchRuntimeState.mockResolvedValue(null);
  relay.fetchRuntimeModels.mockResolvedValue({ models: [], current: null });
  relay.fetchAskQuestionDisplay.mockResolvedValue(null);
  relay.requestTicket.mockResolvedValue('ticket_hold_001');
  relay.getRelayHeartbeat.mockResolvedValue({ ok: true });
  relay.fetchApprovals.mockResolvedValue({ items: [] });
  relay.fetchSessions.mockResolvedValue({ sessions: [] });
  relay.openSyncSocket.mockResolvedValue({ close: () => undefined });
  });

afterEach(() => {
  cleanup();
  clearChatDraftCache();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

const AT = '2026-08-13T10:00:00.000Z';
const SESSION_ID = 'session_hold_a';

function transcriptState(blocks: unknown[] = []) {
  return {
    ...EMPTY_TRANSCRIPT,
    sessionId: SESSION_ID,
    epoch: 'epoch_hold_001',
    source: 'relay',
    coversThrough: 10,
    updatedAt: AT,
    blocks,
  };
}

function relayEcho(text: string, seq = 11) {
  return {
    id: 'block_host_echo_1',
    kind: 'text',
    role: 'user',
    text,
    revision: 1,
    seq,
    occurredAt: AT,
    provenance: 'relay',
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
      status: 'idle',
      onBack: vi.fn(),
      ...overrides,
    },
  });
  return { view, dispatchTranscript };
}

function optimisticBlockId(dispatchTranscript: ReturnType<typeof vi.fn>): string {
  const call = dispatchTranscript.mock.calls.find((call) => call[0]?.type === 'promptOptimistic');
  if (call === undefined) throw new Error('no optimistic dispatch captured');
  return call[0].block.id as string;
}

function deliveryUnknown() {
  return new relay.PromptDeliveryError(
    { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
    'Prompt delivery is unresolved.',
  );
}

async function sendDraft(rawDraft: string) {
  const textarea = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await userEvent.type(textarea, rawDraft);
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledOnce());
  return textarea;
}

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('delivery hold on a thrown send', () => {
  it('does not restore the draft when the echoed turn lands during the hold', async () => {
  relay.submitPrompt.mockRejectedValueOnce(deliveryUnknown());
  const { view, dispatchTranscript } = renderSession();
  const textarea = await sendDraft('padded turn ');
  expect(textarea).toHaveValue('');

  // The turn landed despite the lost ack: the transcript now carries
  // the host's own echo of the user turn.
  view.rerender({
    connection: 'live',
    sessionId: SESSION_ID,
    initialCache: null,
    transcript: transcriptState([relayEcho('padded turn')]),
    status: 'idle',
  });
  await waitFor(() =>
    expect(dispatchTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'promptRejected',
        sessionId: SESSION_ID,
        optimisticId: optimisticBlockId(dispatchTranscript),
      }),
    ),
  );

  // No restore, no invitation to resend, no auto-resend.
  expect(textarea).toHaveValue('');
  expect(relay.submitPrompt).toHaveBeenCalledTimes(1);
  await tick();
  expect(textarea).toHaveValue('');
  });

  it('restores the exact raw draft — whitespace intact — when the deadline expires', async () => {
  relay.submitPrompt.mockRejectedValueOnce(deliveryUnknown());
  const { view, dispatchTranscript } = renderSession();
  const textarea = await sendDraft('  precise draft  ');
  expect(textarea).toHaveValue('');
  expect(relay.submitPrompt).toHaveBeenCalledWith(
    SESSION_ID,
    expect.stringMatching(/^prompt_/u),
    'precise draft',
    undefined,
  );

  // Jump past the watch deadline and give the watcher effect a run.
  const nowSpy = vi.spyOn(Date, 'now');
  nowSpy.mockReturnValue(Date.now() + 21_000);
  view.rerender({
    connection: 'live',
    sessionId: SESSION_ID,
    initialCache: null,
    transcript: transcriptState(),
    status: 'idle',
  });
  await waitFor(() =>
    expect(dispatchTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'promptRejected',
        sessionId: SESSION_ID,
        optimisticId: optimisticBlockId(dispatchTranscript),
      }),
    ),
  );
  nowSpy.mockRestore();

  // The exact raw draft, byte-identical to what was typed.
  expect(textarea).toHaveValue('  precise draft  ');

  // A resend reuses the same submissionId, so the host can dedupe.
  const firstSubmissionId = relay.submitPrompt.mock.calls[0][1] as string;
  relay.submitPrompt.mockResolvedValueOnce({ id: 'block_retry', kind: 'text' });
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledTimes(2));
  expect(relay.submitPrompt.mock.calls[1][1]).toBe(firstSubmissionId);
  });

  it('restores promptly on a definite rejection — no hold', async () => {
  relay.submitPrompt.mockRejectedValueOnce(
    new relay.PromptDeliveryError(
      { status: 'rejected', reasonCode: 'access_denied' },
      'Relay access denied.',
    ),
  );
  const { dispatchTranscript } = renderSession();
  const textarea = await sendDraft('  refused draft  ');

  expect(textarea).toHaveValue('  refused draft  ');
  expect(dispatchTranscript).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'promptRejected', sessionId: SESSION_ID }),
  );
  });

  it('restores the raw draft through the settle window without clearing it', async () => {
  // Guards against the restore being swallowed by a later settle-window
  // effect run: after restoration the draft must still be there.
  relay.submitPrompt.mockRejectedValueOnce(
    new relay.PromptDeliveryError(
      { status: 'rejected', reasonCode: 'request_failed' },
      'Relay request failed.',
    ),
  );
  renderSession();
  const textarea = await sendDraft('  kept draft  ');
  await tick();
  await tick();
  expect(textarea).toHaveValue('  kept draft  ');
  });


  it('keeps every overlapping send held — a second send cannot erase the first', async () => {
    // Two unresolved sends in the same window. Neither raw draft may be lost:
    // one hold overwriting the other silently eats a message.
    relay.submitPrompt.mockRejectedValue(deliveryUnknown());
    const { view, dispatchTranscript } = renderSession();
    const textarea = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
    await userEvent.type(textarea, '  first message  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledOnce());
    await userEvent.type(textarea, '  second message  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(relay.submitPrompt).toHaveBeenCalledTimes(2));
    const firstOptimistic = dispatchTranscript.mock.calls
      .map((call) => call[0] as { type: string; block?: { id: string } })
      .find((event) => event.type === 'promptOptimistic')?.block?.id;
    expect(firstOptimistic).toBeDefined();

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(Date.now() + 21_000);
    view.rerender({
      connection: 'live',
      sessionId: SESSION_ID,
      initialCache: null,
      transcript: transcriptState(),
      status: 'idle',
    });
    // BOTH sends must reach a verdict, not just the last one.
    await waitFor(() =>
      expect(dispatchTranscript).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'promptRejected', optimisticId: firstOptimistic }),
      ),
    );
    nowSpy.mockRestore();
    view.unmount();
  });

  it('parks an unresolved draft when the session switches mid-hold', async () => {
    // Navigating away ends the watch. The text must return with its own
    // session rather than disappearing.
    relay.submitPrompt.mockRejectedValueOnce(deliveryUnknown());
    const { view } = renderSession();
    await sendDraft('  in flight  ');

    view.rerender({
      connection: 'live',
      sessionId: 'session_elsewhere',
      initialCache: null,
      transcript: { ...transcriptState(), sessionId: 'session_elsewhere' },
      status: 'idle',
    });
    await tick();
    expect(readParkedDraftText(SESSION_ID)).toBe('  in flight  ');
    view.unmount();
  });
});

describe('per-session draft park across navigation', () => {
  it('parks the raw draft on unmount and restores it on return', async () => {
  const first = renderSession();
  const textarea = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await userEvent.type(textarea, '  parked draft  ');
  await tick();
  first.view.unmount();

  // "Navigate home, then back into the same session."
  const second = renderSession();
  const restored = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await waitFor(() => expect(restored).toHaveValue('  parked draft  '));
  second.view.unmount();
  });

  it('degrades to an empty draft when reading the park throws', async () => {
  // A draft is parked, but the store becomes unreadable: the composer
  // must open empty rather than surfacing a storage error.
  parkDraftText(SESSION_ID, '  parked draft  ');
  // Spy the live storage object: the cache calls window.localStorage.getItem,
  // which jsdom does not necessarily resolve through Storage.prototype.
  const originalGetItem = window.localStorage.getItem.bind(window.localStorage);
  const getItemSpy = vi
    .spyOn(window.localStorage, 'getItem')
    .mockImplementation((key: string) => {
      if (key.startsWith('pi-remote.chat-draft:')) {
        throw new Error('Storage unavailable');
      }
      return originalGetItem(key);
    });

  const { view } = renderSession();
  const textarea = screen.getByLabelText('Message Pi') as HTMLTextAreaElement;
  await waitFor(() => expect(textarea).toHaveValue(''));
  getItemSpy.mockRestore();
  view.unmount();
  });
});
