import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';
import { useCallback, useEffect, useState } from 'react';

import { fetchAskQuestionDisplay } from '../../relay.js';
import { releaseAskQuestionEphemeral, setAskQuestionDisplay } from './askQuestionEphemeralStore.js';
import {
  isAskQuestionTerminalState,
  toAskQuestionViewModel,
  transcriptStatusToUiState,
  type AskQuestionViewModel,
} from './askQuestionTypes.js';
import { AskQuestionFreeText } from './AskQuestionFreeText.js';
import { AskQuestionOptionList } from './AskQuestionOptionList.js';
import { AskQuestionPrompt } from './AskQuestionPrompt.js';
import { AskQuestionStatus } from './AskQuestionStatus.js';
import { AskQuestionSubmitButton } from './AskQuestionSubmitButton.js';
import { useAskQuestionMutation } from './useAskQuestionMutation.js';
import { useAskQuestionState } from './useAskQuestionState.js';

export interface AskQuestionCardProps {
  readonly block: AskQuestionTranscriptMeta;
  readonly sessionId?: string;
  readonly canAnswer?: boolean;
  readonly principal?: string | undefined;
}

export function AskQuestionCard({
  block,
  canAnswer = true,
  principal,
}: AskQuestionCardProps) {
  const [viewModel, setViewModel] = useState<AskQuestionViewModel | null>(null);
  const stateApi = useAskQuestionState(viewModel, {
    initialState: transcriptStatusToUiState(block.status),
  });
  const resolveResult = stateApi.resolveResult;
  const applyTranscriptStatus = stateApi.applyTranscriptStatus;
  const onResult = useCallback(
    (result: Parameters<typeof resolveResult>[0]) => resolveResult(result),
    [resolveResult],
  );
  const mutation = useAskQuestionMutation({
    sessionId: block.sessionId,
    viewModel,
    principal,
    onResult,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setViewModel(null);
    void fetchAskQuestionDisplay(
      block.sessionId,
      block.questionId,
      block.presentedRevision,
      controller.signal,
    )
      .then((payload) => {
        const guarded = toAskQuestionViewModel(payload);
        if (
          !active ||
          guarded === null ||
          guarded.sessionId !== block.sessionId ||
          guarded.questionId !== block.questionId ||
          guarded.revision !== block.presentedRevision
        ) {
          return;
        }
        setAskQuestionDisplay(guarded);
        setViewModel(guarded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
      releaseAskQuestionEphemeral(block.questionId, block.presentedRevision);
    };
  }, [block.presentedRevision, block.questionId, block.sessionId]);

  useEffect(() => {
    applyTranscriptStatus(block.status);
  }, [applyTranscriptStatus, block.status]);

  useEffect(() => {
    if (viewModel !== null && isAskQuestionTerminalState(stateApi.state.phase)) {
      releaseAskQuestionEphemeral(viewModel.questionId, viewModel.revision);
    }
    return () => {
      if (viewModel !== null && isAskQuestionTerminalState(stateApi.state.phase)) {
        releaseAskQuestionEphemeral(viewModel.questionId, viewModel.revision);
      }
    };
  }, [stateApi.state.phase, viewModel]);

  if (viewModel === null) {
    return (
      <article className="ask-question-card ask-question-card-loading" data-ask-question-card>
        <span className="sr-only">Loading question</span>
      </article>
    );
  }

  const lifecyclePhase = transcriptStatusToUiState(block.status);
  const lifecycleLocks =
    lifecyclePhase === 'submitting' || isAskQuestionTerminalState(lifecyclePhase);
  const effectivePhase = lifecycleLocks ? lifecyclePhase : stateApi.state.phase;
  const effectiveState =
    effectivePhase === stateApi.state.phase
      ? stateApi.state
      : { ...stateApi.state, phase: effectivePhase };
  const terminal = isAskQuestionTerminalState(effectivePhase);
  const submitting = effectivePhase === 'submitting' || mutation.submitting;
  const controlsDisabled =
    !canAnswer || submitting || terminal;
  const validationVisible =
    stateApi.validationMessage !== null &&
    (effectivePhase === 'selecting' || effectivePhase === 'error');

  return (
    <article
      className={`ask-question-card ask-question-card-${effectivePhase}`}
      data-ask-question-card
      aria-busy={submitting}
    >
      <AskQuestionPrompt viewModel={viewModel} />
      {viewModel.requiresReadOnlyHint && (
        <p className="ask-question-read-only-hint">
          Answers are sent only while this authenticated read-only session is active.
        </p>
      )}
      {!terminal && (
        <form
          className="ask-question-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (terminal || submitting) return;
            const intent = stateApi.beginSubmit();
            if (intent !== null) void mutation.submit(intent);
          }}
        >
          <AskQuestionOptionList
            viewModel={viewModel}
            selectedOptionIds={stateApi.state.selectedOptionIds}
            disabled={controlsDisabled}
            onToggle={stateApi.selectOption}
          />
          <AskQuestionFreeText
            viewModel={viewModel}
            value={stateApi.state.freeText}
            disabled={controlsDisabled}
            invalid={validationVisible}
            onChange={stateApi.setFreeText}
          />
          {validationVisible && (
            <p className="ask-question-validation" role="alert">
              {stateApi.validationMessage}
            </p>
          )}
          <AskQuestionSubmitButton
            disabled={!canAnswer || !stateApi.canSubmit || submitting || terminal}
          />
        </form>
      )}
      <AskQuestionStatus state={effectiveState} />
      {effectiveState.phase === 'answered-immutable' && effectiveState.errorReason === null && (
        <p className="ask-question-answered-line">Answer accepted by Pi.</p>
      )}
      {!canAnswer && !terminal && (
        <p className="ask-question-read-only-hint">Reconnect before submitting an answer.</p>
      )}
    </article>
  );
}
