import type {
  AskQuestionAnswerResult,
  AskQuestionDisplayDto,
  AskQuestionTranscriptMeta,
} from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const relay = vi.hoisted(() => ({
  fetchAskQuestionDisplay: vi.fn(),
  requestAskQuestionAnswerTicket: vi.fn(),
  submitAskQuestionAnswer: vi.fn(),
}));

vi.mock('../src/shared/transport/relay.js', () => relay);
vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({ subscribe: (run: (v: unknown) => void) => { run(value); return () => {}; } });
  return {
    createVirtualizer: (opts: { count?: number }) => {
      let count = opts?.count ?? 0;
      const api = {
        getTotalSize: () => count * 180,
        getVirtualItems: () => Array.from({ length: count }, (_unused, index) => ({ index, start: index * 180, key: index })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => { if (typeof next?.count === 'number') count = next.count; },
      };
      return store(api);
    },
  };
});

import { saveCache } from '../src/shared/transport/cache.js';
import { clearAskQuestionEphemeralStore } from '../src/pages/chat/features/ask-question/askQuestionEphemeralStore.js';
import AskQuestionCard from '../src/pages/chat/features/ask-question/AskQuestionCard.svelte';
import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock, TranscriptState } from '../src/shared/state/state.js';

const sessionId = 'session_card_001';
const questionId = 'question_card_001';
const activityId = 'activity_card_001';
const occurredAt = '2026-08-18T10:00:00.000Z';
const PROMPT = 'SENSITIVE PROMPT MUST STAY VOLATILE';
const OPTION_A = 'SENSITIVE OPTION A';
const OPTION_B = 'SENSITIVE OPTION B';
const FREE_TEXT = 'SENSITIVE OPERATOR ANSWER';

const display: AskQuestionDisplayDto = {
  type: 'session.ask-question.display',
  sessionId,
  questionId,
  activityId,
  revision: 3,
  display: {
    prompt: PROMPT,
    options: [
      { id: 'option_card_a', label: OPTION_A, description: 'First guarded option.' },
      { id: 'option_card_b', label: OPTION_B, description: 'Second guarded option.' },
    ],
    freeText: {
      allowed: true,
      required: false,
      placeholder: 'Optional note',
      maxLength: 120,
    },
    minSelections: 1,
    maxSelections: 2,
  },
  selectionMode: 'multiple',
  redaction: {
    applied: true,
    policyVersion: 1,
    contentAvailability: 'available',
    redactedFields: [],
  },
  requiresReadOnlyHint: true,
};

const singleDisplay: AskQuestionDisplayDto = {
  ...display,
  selectionMode: 'single',
  display: { ...display.display, minSelections: 1, maxSelections: 1 },
};

const requiredFreeTextDisplay: AskQuestionDisplayDto = {
  ...display,
  display: {
    prompt: 'Provide the required operator note.',
    options: [],
    freeText: { allowed: true, required: true, placeholder: 'Required note', maxLength: 120 },
  },
};

function block(status: AskQuestionTranscriptMeta['status'] = 'presented'): AskQuestionTranscriptMeta {
  return {
    id: 'ask_block_001',
    revision: 1,
    seq: 2,
    occurredAt,
    kind: 'ask-question',
    activityId,
    questionId,
    sessionId,
    presentedRevision: display.revision,
    status,
  };
}

function acceptedResult(clientMutationId: string): AskQuestionAnswerResult {
  return {
    type: 'session.ask-question.answer-result',
    sessionId,
    questionId,
    revision: display.revision,
    clientMutationId,
    status: 'accepted',
  };
}

function rejectedResult(
  clientMutationId: string,
  reason: 'validation-failed' | 'delivery-unknown' | 'revision-mismatch',
): AskQuestionAnswerResult {
  return {
    type: 'session.ask-question.answer-result',
    sessionId,
    questionId,
    revision: display.revision,
    clientMutationId,
    status: 'rejected',
    reason,
  };
}

function renderCard(
  viewModel: AskQuestionDisplayDto = display,
  currentBlock: AskQuestionTranscriptMeta = block(),
) {
  relay.fetchAskQuestionDisplay.mockResolvedValue(viewModel);
  return render(AskQuestionCard, { props: { block: currentBlock, principal: 'operator@example.test' } });
}

async function waitForCard(prompt = display.display.prompt) {
  await waitFor(() => expect(screen.getByText(prompt)).toBeInTheDocument());
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAskQuestionEphemeralStore();
  localStorage.clear();
  relay.fetchAskQuestionDisplay.mockResolvedValue(display);
  relay.requestAskQuestionAnswerTicket.mockResolvedValue({
    ticket: 'ticket_card_001',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });
  relay.submitAskQuestionAnswer.mockImplementation((request: { clientMutationId: string }) =>
    Promise.resolve(acceptedResult(request.clientMutationId)),
  );
});

afterEach(() => {
  cleanup();
  clearAskQuestionEphemeralStore();
  localStorage.clear();
});

describe('ask-question inline card', () => {
  it('renders once at the transcript position without a modal or scrim', async () => {
    const preceding: DisplayTranscriptBlock = {
      id: 'preceding_text_001',
      revision: 1,
      seq: 1,
      occurredAt,
      kind: 'text',
      role: 'user',
      text: 'Before the question',
    };
    const following: DisplayTranscriptBlock = {
      id: 'following_text_001',
      revision: 1,
      seq: 3,
      occurredAt,
      kind: 'text',
      role: 'assistant',
      text: 'After the question',
    };
    const { container } = render(TranscriptList, {
      props: {
        sessionId,
        blocks: [preceding, block(), following],
        running: false,
      },
    });

    await waitFor(() => expect(container.querySelectorAll('[data-ask-question-card]')).toHaveLength(1));
    const cards = [...container.querySelectorAll('[data-ask-question-card]')];
    expect(cards[0]?.textContent).toContain(PROMPT);
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-modal="true"]')).not.toBeInTheDocument();
    expect(container.querySelector('.modal-scrim')).not.toBeInTheDocument();
    expect(container.textContent?.indexOf('Before the question')).toBeLessThan(
      container.textContent?.indexOf(PROMPT) ?? 0,
    );
    expect(container.textContent?.indexOf(PROMPT)).toBeLessThan(
      container.textContent?.indexOf('After the question') ?? 0,
    );
  });

  it('renders content only from the guarded volatile display read', async () => {
    const transcriptBlock = block();
    renderCard();
    await waitForCard();

    expect(screen.getByText(PROMPT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OPTION_A })).toBeInTheDocument();
    expect(screen.queryByText('Persisted transcript prompt')).not.toBeInTheDocument();
    expect(relay.fetchAskQuestionDisplay).toHaveBeenCalledWith(
      sessionId,
      transcriptBlock.questionId,
      transcriptBlock.presentedRevision,
      expect.any(AbortSignal),
    );
  });

  it('keeps single and multiple selection local with no mutation on edit or blur', async () => {
    const user = userEvent.setup();
    renderCard();
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    await user.click(screen.getByRole('button', { name: OPTION_B }));
    const note = screen.getByPlaceholderText('Optional note');
    await user.type(note, FREE_TEXT);
    fireEvent.blur(note);

    expect(screen.getByRole('button', { name: OPTION_A })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: OPTION_B })).toHaveAttribute('aria-pressed', 'true');
    expect(note).toHaveValue(FREE_TEXT);
    expect(relay.requestAskQuestionAnswerTicket).not.toHaveBeenCalled();
    expect(relay.submitAskQuestionAnswer).not.toHaveBeenCalled();

    cleanup();
    clearAskQuestionEphemeralStore();
    relay.fetchAskQuestionDisplay.mockResolvedValue(singleDisplay);
    render(AskQuestionCard, { props: { block: block(), principal: 'operator@example.test' } });
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    await user.click(screen.getByRole('button', { name: OPTION_B }));
    expect(screen.getByRole('button', { name: OPTION_A })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: OPTION_B })).toHaveAttribute('aria-pressed', 'true');
    expect(relay.requestAskQuestionAnswerTicket).not.toHaveBeenCalled();
  });

  it('validates required free text locally before enabling explicit submit', async () => {
    const user = userEvent.setup();
    renderCard(requiredFreeTextDisplay);
    await waitForCard(requiredFreeTextDisplay.display.prompt);

    const submit = screen.getByRole('button', { name: 'Submit answer' });
    expect(submit).toBeDisabled();
    const note = screen.getByPlaceholderText('Required note');
    await user.type(note, 'A valid response');
    expect(submit).toBeEnabled();
    expect(relay.requestAskQuestionAnswerTicket).not.toHaveBeenCalled();
  });

  it('enters submitting only after explicit submit and disables every answer control', async () => {
    const user = userEvent.setup();
    let resolveAnswer: ((result: AskQuestionAnswerResult) => void) | undefined;
    relay.submitAskQuestionAnswer.mockImplementation(
      () => new Promise<AskQuestionAnswerResult>((resolve) => (resolveAnswer = resolve)),
    );
    renderCard();
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    const form = screen.getByRole('button', { name: 'Submit answer' }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(relay.requestAskQuestionAnswerTicket).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Submitting…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OPTION_A })).toBeDisabled();
    expect(screen.getByPlaceholderText('Optional note')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled();
    expect(relay.submitAskQuestionAnswer).toHaveBeenCalledTimes(1);

    resolveAnswer?.(acceptedResult(relay.submitAskQuestionAnswer.mock.calls[0]?.[0]?.clientMutationId));
    await waitFor(() => expect(screen.getByText('Answer accepted by Pi.')).toBeInTheDocument());
  });

  it('preserves local values after a retryable rejection and accepts only the host result', async () => {
    const user = userEvent.setup();
    relay.submitAskQuestionAnswer.mockImplementationOnce((request: { clientMutationId: string }) =>
      Promise.resolve(rejectedResult(request.clientMutationId, 'validation-failed')),
    );
    renderCard();
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    const note = screen.getByPlaceholderText('Optional note');
    await user.type(note, FREE_TEXT);

    expect(screen.queryByText('Answer accepted by Pi.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    await waitFor(() => expect(screen.getByText(/not accepted/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: OPTION_A })).toHaveAttribute('aria-pressed', 'true');
    expect(note).toHaveValue(FREE_TEXT);
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled();

    relay.submitAskQuestionAnswer.mockImplementationOnce((request: { clientMutationId: string }) =>
      Promise.resolve(acceptedResult(request.clientMutationId)),
    );
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));
    await waitFor(() => expect(screen.getByText('Answer accepted by Pi.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: OPTION_A })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Optional note')).not.toBeInTheDocument();
    expect(relay.requestAskQuestionAnswerTicket).toHaveBeenCalledTimes(2);
  });

  it('blocks stale terminal lifecycle states and releases the volatile entry', async () => {
    renderCard(display, block('expired'));
    await waitForCard();
    expect(screen.getByText('This question is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: OPTION_A })).not.toBeInTheDocument();
    expect(relay.requestAskQuestionAnswerTicket).not.toHaveBeenCalled();
  });

  it('treats delivery-unknown as terminal and never offers a stale retry', async () => {
    const user = userEvent.setup();
    relay.submitAskQuestionAnswer.mockImplementationOnce((request: { clientMutationId: string }) =>
      Promise.resolve(rejectedResult(request.clientMutationId, 'delivery-unknown')),
    );
    renderCard();
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    await user.click(screen.getByRole('button', { name: 'Submit answer' }));

    await waitFor(() => expect(screen.getByText(/may have received/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: OPTION_A })).not.toBeInTheDocument();
    expect(relay.requestAskQuestionAnswerTicket).toHaveBeenCalledTimes(1);
  });

  it('does not place prompt, options, answer, ticket, or digest in storage or URL', async () => {
    const user = userEvent.setup();
    const initialUrl = window.location.href;
    renderCard();
    await waitForCard();
    await user.click(screen.getByRole('button', { name: OPTION_A }));
    await user.type(screen.getByPlaceholderText('Optional note'), FREE_TEXT);

    const cacheState: TranscriptState = {
      sessionId,
      epoch: null,
      coversThrough: 2,
      blocks: [block()],
      pendingPromptIds: [],
      source: 'relay',
      updatedAt: occurredAt,
      awaitingSnapshot: false,
      gapReason: null,
      error: null,
    };
    saveCache([], cacheState);
    const serializedStorage = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? '') ?? '',
    ).join('\n');
    expect(serializedStorage).not.toContain(PROMPT);
    expect(serializedStorage).not.toContain(OPTION_A);
    expect(serializedStorage).not.toContain(FREE_TEXT);
    expect(serializedStorage).not.toContain('ticket_card_001');
    expect(serializedStorage).not.toContain('answerDigest');
    expect(window.location.href).toBe(initialUrl);
  });
});