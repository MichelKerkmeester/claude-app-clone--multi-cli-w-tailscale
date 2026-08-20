import {
  askQuestionAnswerDigest,
  isAskQuestionAnswer,
  type AskQuestionAnswerRequest,
  type AskQuestionAnswerResult,
  type AskQuestionAnswerTicketRequest,
} from '@pi-remote/pi-rpc-protocol';
import { useCallback, useRef, useState } from 'react';

import {
  AskQuestionRelayError,
  requestAskQuestionAnswerTicket,
  submitAskQuestionAnswer,
} from '../../relay.js';
import { isDemoMode } from '../../demo.js';
import type { AskQuestionSubmitIntent, AskQuestionViewModel } from './askQuestionTypes.js';

export interface UseAskQuestionMutationOptions {
  readonly sessionId: string;
  readonly viewModel: AskQuestionViewModel | null;
  readonly principal?: string | undefined;
  readonly onResult: (result: AskQuestionAnswerResult) => void;
}

export interface AskQuestionMutationApi {
  readonly submitting: boolean;
  readonly submit: (intent: AskQuestionSubmitIntent) => Promise<void>;
}

export function useAskQuestionMutation({
  sessionId,
  viewModel,
  principal,
  onResult,
}: UseAskQuestionMutationOptions): AskQuestionMutationApi {
  const inFlight = useRef(new Map<string, Promise<void>>());
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    (intent: AskQuestionSubmitIntent): Promise<void> => {
      if (viewModel === null) return Promise.resolve();
      const currentViewModel = viewModel;
      const existing = inFlight.current.get(intent.clientMutationId);
      if (existing !== undefined) return existing;

      const operation = (async () => {
        setSubmitting(true);
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
          setSubmitting(false);
        }
      })();

      inFlight.current.set(intent.clientMutationId, operation);
      void operation.finally(() => {
        inFlight.current.delete(intent.clientMutationId);
      });
      return operation;
    },
    [onResult, principal, sessionId, viewModel],
  );

  return { submitting, submit };
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
