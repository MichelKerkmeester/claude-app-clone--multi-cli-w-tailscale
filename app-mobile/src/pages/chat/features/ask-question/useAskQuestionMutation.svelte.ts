// ───────────────────────────────────────────────────────────────────
// MODULE: Ask-Question Answer Mutation
// ───────────────────────────────────────────────────────────────────

import {
  askQuestionAnswerDigest,
  isAskQuestionAnswer,
  type AskQuestionAnswerRequest,
  type AskQuestionAnswerResult,
  type AskQuestionAnswerTicketRequest,
} from '@pi-remote/pi-rpc-protocol';

import {
  AskQuestionRelayError,
  requestAskQuestionAnswerTicket,
  submitAskQuestionAnswer,
} from '../../../../shared/data/relay.js';
import { isDemoMode } from '../../../../shared/data/demo.js';
import type {
  AskQuestionSubmitIntent,
  AskQuestionViewModel,
} from './askQuestionTypes.js';

export interface AskQuestionMutationApi {
  readonly submitting: boolean;
  readonly submit: (intent: AskQuestionSubmitIntent) => Promise<void>;
}

export function useAskQuestionMutation(
  getSessionId: () => string,
  getViewModel: () => AskQuestionViewModel | null,
  getPrincipal: () => string | undefined,
  onResult: (result: AskQuestionAnswerResult) => void,
): AskQuestionMutationApi {
  const inFlight = new Map<string, Promise<void>>();
  let submitting = $state(false);

  function submit(intent: AskQuestionSubmitIntent): Promise<void> {
    const viewModel = getViewModel();
    if (viewModel === null) return Promise.resolve();
    const currentViewModel = viewModel;
    const existing = inFlight.get(intent.clientMutationId);
    if (existing !== undefined) return existing;
    const sessionId = getSessionId();
    const principal = getPrincipal();

    const operation = (async () => {
      submitting = true;
      try {
        const answer = intent.answer;
        if (!isAskQuestionAnswer(answer)) {
          throw new AskQuestionRelayError('validation-failed');
        }
        const bindingPrincipal = readAskQuestionPrincipal(principal);
        if (bindingPrincipal === null) {
          throw new AskQuestionRelayError('host-unavailable');
        }
        const answerDigest = askQuestionAnswerDigest(answer, {
          questionId: currentViewModel.questionId,
          expectedRevision: currentViewModel.revision,
          principal: bindingPrincipal,
        });
        const ticketRequest: AskQuestionAnswerTicketRequest = {
          type: 'session.ask-question.answer-ticket',
          sessionId,
          questionId: currentViewModel.questionId,
          expectedRevision: currentViewModel.revision,
          answerDigest,
          clientMutationId: intent.clientMutationId,
        };
        const ticketResponse = await requestAskQuestionAnswerTicket(ticketRequest);
        const answerRequest: AskQuestionAnswerRequest = {
          type: 'session.ask-question.answer',
          sessionId,
          questionId: currentViewModel.questionId,
          expectedRevision: currentViewModel.revision,
          ticket: ticketResponse.ticket,
          answer,
          answerDigest,
          clientMutationId: intent.clientMutationId,
        };
        const result = await submitAskQuestionAnswer(answerRequest);
        onResult(result);
      } catch (cause: unknown) {
        const reason =
          typeof AskQuestionRelayError === 'function' && cause instanceof AskQuestionRelayError
            ? cause.reason
            : 'host-unavailable';
        onResult(
          rejectedAskQuestionResult(sessionId, currentViewModel, intent.clientMutationId, reason),
        );
      } finally {
        submitting = false;
      }
    })();

    inFlight.set(intent.clientMutationId, operation);
    void operation.finally(() => {
      inFlight.delete(intent.clientMutationId);
    });
    return operation;
  }

  return {
    get submitting() {
      return submitting;
    },
    submit,
  };
}

function readAskQuestionPrincipal(principal: string | undefined): string | null {
  const supplied = principal?.trim();
  if (supplied !== undefined && supplied.length > 0) return supplied;
  if (isDemoMode()) return 'demo-operator';
  const runtime = globalThis as typeof globalThis & {
    readonly __PI_REMOTE_PRINCIPAL__?: unknown;
  };
  return typeof runtime.__PI_REMOTE_PRINCIPAL__ === 'string' &&
    runtime.__PI_REMOTE_PRINCIPAL__.trim().length > 0
    ? runtime.__PI_REMOTE_PRINCIPAL__.trim()
    : null;
}

function rejectedAskQuestionResult(
  sessionId: string,
  viewModel: AskQuestionViewModel,
  clientMutationId: string,
  reason: AskQuestionRelayError['reason'],
): AskQuestionAnswerResult {
  return {
    type: 'session.ask-question.answer-result',
    sessionId,
    questionId: viewModel.questionId,
    revision: viewModel.revision,
    clientMutationId,
    status: 'rejected',
    reason,
  };
}
