import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';
import { useCallback, useEffect, useId, useState } from 'react';

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
import { useAskQuestionKeyboardNavigation } from './useAskQuestionKeyboardNavigation.js';
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

  const labelId = useId();
  const optionsLabelId = useId();
  const statusId = useId();
  const errorId = useId();
  const lifecyclePhase = transcriptStatusToUiState(block.status);
  const lifecycleLocks =
    lifecyclePhase === 'submitting' || isAskQuestionTerminalState(lifecyclePhase);
  const effectivePhase =
    viewModel === null
      ? lifecyclePhase
      : lifecycleLocks
        ? lifecyclePhase
        : stateApi.state.phase;
  const effectiveState =
    effectivePhase === stateApi.state.phase
      ? stateApi.state
      : { ...stateApi.state, phase: effectivePhase };
  const terminal = isAskQuestionTerminalState(effectivePhase);
  const submitting = effectivePhase === 'submitting' || mutation.submitting;
  const controlsDisabled = !canAnswer || submitting || terminal;
  const validationVisible =
    stateApi.validationMessage !== null &&
    (effectivePhase === 'selecting' || effectivePhase === 'error');
  const beginSubmit = stateApi.beginSubmit;
  const submitMutation = mutation.submit;
  const submitAnswer = useCallback(() => {
    if (terminal || submitting) return;
    const intent = beginSubmit();
    if (intent !== null) void submitMutation(intent);
  }, [beginSubmit, submitting, submitMutation, terminal]);
  const cardRef = useAskQuestionKeyboardNavigation({
    identity: `${block.questionId}:${block.presentedRevision}`,
    enabled: viewModel !== null && canAnswer && !submitting && !terminal,
    terminal,
    optionCount: viewModel?.display.options.length ?? 0,
    hasFreeText: viewModel?.display.freeText.allowed ?? false,
    freeTextRequired: viewModel?.display.freeText.required ?? false,
    labelId,
    optionsLabelId,
    statusId,
    errorId,
    errorVisible: validationVisible,
    submit: submitAnswer,
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
      <article
        ref={cardRef}
        className="ask-question-card ask-question-card-loading"
        data-ask-question-card
        role="status"
        aria-live="polite"
        aria-label="Loading question"
        tabIndex={-1}
      >
        <span className="sr-only">Loading question</span>
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      className={`ask-question-card ask-question-card-${effectivePhase}`}
      data-ask-question-card
      data-ask-question-phase={effectivePhase}
      role="region"
      aria-label="Ask question"
      aria-labelledby={labelId}
      aria-describedby={statusId}
      aria-busy={submitting}
      tabIndex={-1}
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
          aria-describedby={statusId}
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer();
          }}
        >
          {viewModel.display.options.length > 0 && (
            <span id={optionsLabelId} className="sr-only">
              Answer options
            </span>
          )}
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
            <p
              id={errorId}
              className="ask-question-validation"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
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
        <p className="ask-question-answered-line" aria-hidden="true">
          Answer accepted by Pi.
        </p>
      )}
      {!canAnswer && !terminal && (
        <p className="ask-question-read-only-hint">Reconnect before submitting an answer.</p>
      )}
    </article>
  );
}
