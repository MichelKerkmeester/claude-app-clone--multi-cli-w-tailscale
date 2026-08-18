import {
  isAskQuestionAnswerResult,
  isAskQuestionDisplayDto,
  type AskQuestionAnswer,
  type AskQuestionAnswerResult,
  type AskQuestionDisplayDto,
  type AskQuestionResultReason,
  type AskQuestionTranscriptMeta,
} from '@pi-remote/pi-rpc-protocol';

export type AskQuestionViewModel = AskQuestionDisplayDto;

export type AskQuestionUiState =
  | 'presented'
  | 'selecting'
  | 'submitting'
  | 'answered-immutable'
  | 'error'
  | 'expired'
  | 'superseded'
  | 'delivery-unknown';

export interface AskQuestionFormState {
  readonly phase: AskQuestionUiState;
  readonly selectedOptionIds: readonly string[];
  readonly freeText: string;
  readonly errorReason: AskQuestionResultReason | null;
  readonly clientMutationId: string | null;
}

export interface AskQuestionSubmitIntent {
  readonly clientMutationId: string;
  readonly answer: AskQuestionAnswer;
}

export function askQuestionKey(questionId: string, revision: number): string {
  return `${questionId}:${revision}`;
}

export function toAskQuestionViewModel(value: unknown): AskQuestionViewModel | null {
  return isAskQuestionDisplayDto(value) ? value : null;
}

export function isAskQuestionViewModel(value: unknown): value is AskQuestionViewModel {
  return isAskQuestionDisplayDto(value);
}

export function isAskQuestionAnswerResultValue(
  value: unknown,
): value is AskQuestionAnswerResult {
  return isAskQuestionAnswerResult(value);
}

export function transcriptStatusToUiState(
  status: AskQuestionTranscriptMeta['status'],
): AskQuestionUiState {
  switch (status) {
    case 'answered':
      return 'answered-immutable';
    case 'expired':
      return 'expired';
    case 'superseded':
      return 'superseded';
    case 'error':
      return 'delivery-unknown';
    case 'submitting':
      return 'submitting';
    default:
      return 'presented';
  }
}

export function isAskQuestionTerminalState(state: AskQuestionUiState): boolean {
  return (
    state === 'answered-immutable' ||
    state === 'expired' ||
    state === 'superseded' ||
    state === 'delivery-unknown'
  );
}

export function isAskQuestionTerminalReason(reason: AskQuestionResultReason): boolean {
  return (
    reason === 'delivery-unknown' ||
    reason === 'revision-mismatch' ||
    reason === 'question-withdrawn' ||
    reason === 'question-already-answered'
  );
}

export function uiStateForAskQuestionReason(
  reason: AskQuestionResultReason,
): AskQuestionUiState | null {
  if (!isAskQuestionTerminalReason(reason)) return null;
  if (reason === 'delivery-unknown') return 'delivery-unknown';
  if (reason === 'revision-mismatch') return 'superseded';
  if (reason === 'question-already-answered') return 'answered-immutable';
  return 'expired';
}

export function safeAskQuestionStatusMessage(
  state: AskQuestionUiState,
  reason: AskQuestionResultReason | null = null,
): string {
  if (state === 'submitting') return 'Submitting…';
  if (state === 'answered-immutable') return 'Answered';
  if (state === 'expired') return 'This question is no longer available.';
  if (state === 'superseded') return 'This question was replaced by a newer revision.';
  if (state === 'delivery-unknown') {
    return 'Pi may have received this answer. Reconcile before trying again.';
  }
  if (state === 'presented') return 'Choose an answer to continue.';
  if (state === 'selecting') return 'Your answer is ready to submit.';
  switch (reason) {
    case 'validation-failed':
      return 'That answer was not accepted. Review the fields and try again.';
    case 'host-unavailable':
      return 'Pi is unavailable. Your answer is still here.';
    case 'plan-mode-blocked':
      return 'Pi is not ready to accept an answer yet.';
    case 'redaction-policy-blocked':
      return 'This question cannot accept an answer right now.';
    case 'invalid-ticket':
      return 'The answer session changed. Try submitting again.';
    default:
      return 'Answer was not accepted. Try again when the question is available.';
  }
}
