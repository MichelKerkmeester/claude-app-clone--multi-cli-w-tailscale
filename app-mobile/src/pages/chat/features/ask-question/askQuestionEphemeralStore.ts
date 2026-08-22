import {
  isAskQuestionTranscriptMeta,
  type AskQuestionAnswer,
  type AskQuestionTranscriptMeta,
} from '@pi-remote/pi-rpc-protocol';

import {
  askQuestionKey,
  type AskQuestionViewModel,
} from './askQuestionTypes.js';

export interface AskQuestionEphemeralDraft {
  readonly selectedOptionIds: readonly string[];
  readonly freeText: string;
}

export interface AskQuestionEphemeralEntry {
  readonly viewModel: AskQuestionViewModel;
  readonly draft: AskQuestionEphemeralDraft;
}

const entries = new Map<string, AskQuestionEphemeralEntry>();

export function getAskQuestionEphemeralEntry(
  questionId: string,
  revision: number,
): AskQuestionEphemeralEntry | null {
  return entries.get(askQuestionKey(questionId, revision)) ?? null;
}

export function setAskQuestionDisplay(viewModel: AskQuestionViewModel): void {
  const key = askQuestionKey(viewModel.questionId, viewModel.revision);
  const current = entries.get(key);
  entries.set(key, {
    viewModel,
    draft: current?.draft ?? { selectedOptionIds: [], freeText: '' },
  });
}

export function setAskQuestionDraft(
  questionId: string,
  revision: number,
  draft: AskQuestionEphemeralDraft,
): void {
  const key = askQuestionKey(questionId, revision);
  const current = entries.get(key);
  if (current === undefined) return;
  entries.set(key, {
    viewModel: current.viewModel,
    draft: {
      selectedOptionIds: [...draft.selectedOptionIds],
      freeText: draft.freeText,
    },
  });
}

export function releaseAskQuestionEphemeral(questionId: string, revision: number): void {
  entries.delete(askQuestionKey(questionId, revision));
}

export function clearAskQuestionEphemeralStore(): void {
  entries.clear();
}

export function askQuestionEphemeralEntryCount(): number {
  return entries.size;
}

export function askQuestionDraftAsAnswer(draft: AskQuestionEphemeralDraft): AskQuestionAnswer {
  return {
    optionIds: [...draft.selectedOptionIds],
    ...(draft.freeText.length === 0 ? {} : { freeText: draft.freeText }),
  };
}

export function isAskQuestionMetadata(value: unknown): value is AskQuestionTranscriptMeta {
  return isAskQuestionTranscriptMeta(value);
}
