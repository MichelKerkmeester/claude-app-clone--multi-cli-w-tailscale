<script module lang="ts">
  import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';

  export interface AskQuestionCardProps {
    readonly block: AskQuestionTranscriptMeta;
    readonly sessionId?: string;
    readonly canAnswer?: boolean;
    readonly principal?: string | undefined;
  }

  let askQuestionUidSequence = 0;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { fetchAskQuestionDisplay } from '../../../../shared/data/relay.js';
  import {
    releaseAskQuestionEphemeral,
    setAskQuestionDisplay,
  } from './askQuestionEphemeralStore.js';
  import {
    isAskQuestionTerminalState,
    toAskQuestionViewModel,
    transcriptStatusToUiState,
    type AskQuestionViewModel,
  } from './askQuestionTypes.js';
  import AskQuestionFreeText from './AskQuestionFreeText.svelte';
  import AskQuestionOptionList from './AskQuestionOptionList.svelte';
  import AskQuestionPrompt from './AskQuestionPrompt.svelte';
  import AskQuestionStatus from './AskQuestionStatus.svelte';
  import AskQuestionSubmitButton from './AskQuestionSubmitButton.svelte';
  import { useAskQuestionKeyboardNavigation } from './useAskQuestionKeyboardNavigation.svelte.js';
  import { useAskQuestionMutation } from './useAskQuestionMutation.svelte.js';
  import { useAskQuestionState } from './useAskQuestionState.svelte.js';

  let { block, canAnswer = true, principal }: AskQuestionCardProps = $props();

  // @ds surface: ask-question — the one-use interactive question card; slot seams below.
  // @ds guardrail: one-use ticketed, revision-bound, FAIL-CLOSED mutation path. The ticket,
  //   revision binding, non-optimistic submit, and keyboard/a11y wiring live in the hooks
  //   (useAskQuestionState / useAskQuestionMutation / useAskQuestionKeyboardNavigation) and are
  //   NOT designer-editable. Only style.css @ds surface: ask-question is editable.
  let viewModel = $state<AskQuestionViewModel | null>(null);
  let cardEl = $state<HTMLElement | null>(null);

  const stateApi = useAskQuestionState(
    () => viewModel,
    () => transcriptStatusToUiState(block.status),
  );
  const mutation = useAskQuestionMutation(
    () => block.sessionId,
    () => viewModel,
    () => principal,
    stateApi.resolveResult,
  );

  const uid = `ask-question-${(askQuestionUidSequence += 1)}`;
  const labelId = `${uid}-label`;
  const optionsLabelId = `${uid}-options`;
  const statusId = `${uid}-status`;
  const errorId = `${uid}-error`;

  const lifecyclePhase = $derived(transcriptStatusToUiState(block.status));
  const lifecycleLocks = $derived(
    lifecyclePhase === 'submitting' || isAskQuestionTerminalState(lifecyclePhase),
  );
  const effectivePhase = $derived(
    viewModel === null ? lifecyclePhase : lifecycleLocks ? lifecyclePhase : stateApi.state.phase,
  );
  const effectiveState = $derived(
    effectivePhase === stateApi.state.phase
      ? stateApi.state
      : { ...stateApi.state, phase: effectivePhase },
  );
  const terminal = $derived(isAskQuestionTerminalState(effectivePhase));
  const submitting = $derived(effectivePhase === 'submitting' || mutation.submitting);
  const controlsDisabled = $derived(!canAnswer || submitting || terminal);
  const validationVisible = $derived(
    stateApi.validationMessage !== null &&
      (effectivePhase === 'selecting' || effectivePhase === 'error'),
  );

  function submitAnswer(): void {
    if (terminal || submitting) return;
    const intent = stateApi.beginSubmit();
    if (intent !== null) void mutation.submit(intent);
  }

  useAskQuestionKeyboardNavigation(
    () => cardEl,
    () => ({
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
    }),
  );

  $effect(() => {
    const sessionId = block.sessionId;
    const questionId = block.questionId;
    const presentedRevision = block.presentedRevision;
    const controller = new AbortController();
    let active = true;
    viewModel = null;
    void fetchAskQuestionDisplay(sessionId, questionId, presentedRevision, controller.signal)
      .then((payload) => {
        const guarded = toAskQuestionViewModel(payload);
        if (
          !active ||
          guarded === null ||
          guarded.sessionId !== sessionId ||
          guarded.questionId !== questionId ||
          guarded.revision !== presentedRevision
        ) {
          return;
        }
        setAskQuestionDisplay(guarded);
        viewModel = guarded;
      })
      .catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
      releaseAskQuestionEphemeral(questionId, presentedRevision);
    };
  });

  $effect(() => {
    const status = block.status;
    untrack(() => stateApi.applyTranscriptStatus(status));
  });

  $effect(() => {
    const vm = viewModel;
    const phase = stateApi.state.phase;
    if (vm !== null && isAskQuestionTerminalState(phase)) {
      releaseAskQuestionEphemeral(vm.questionId, vm.revision);
    }
    return () => {
      if (vm !== null && isAskQuestionTerminalState(phase)) {
        releaseAskQuestionEphemeral(vm.questionId, vm.revision);
      }
    };
  });
</script>

{#if viewModel === null}
  <!-- @ds state: loading — the display is being fetched; no interactive controls yet. -->
  <article
    bind:this={cardEl}
    class="ask-question-card ask-question-card-loading"
    data-ask-question-card="true"
    role="status"
    aria-live="polite"
    aria-label="Loading question"
    tabindex="-1"
  >
    <span class="sr-only">Loading question</span>
  </article>
{:else}
  <article
    bind:this={cardEl}
    class={`ask-question-card ask-question-card-${effectivePhase}`}
    data-ask-question-card="true"
    data-ask-question-phase={effectivePhase}
    role="region"
    aria-label="Ask question"
    aria-labelledby={labelId}
    aria-describedby={statusId}
    aria-busy={submitting}
    tabindex="-1"
  >
    <!-- @ds slot: prompt — question eyebrow + display headline. -->
    <AskQuestionPrompt {viewModel} />
    <!-- @ds slot: read-only-hint — note shown while this authenticated read-only session gates answers. -->
    {#if viewModel.requiresReadOnlyHint}
      <p class="ask-question-read-only-hint">
        Answers are sent only while this authenticated read-only session is active.
      </p>
    {/if}
    <!-- @ds slot: form — answer controls; the guarded one-use submit mutation is not editable. -->
    {#if !terminal}
      <form
        class="ask-question-form"
        aria-describedby={statusId}
        onsubmit={(event) => {
          event.preventDefault();
          submitAnswer();
        }}
      >
        {#if viewModel.display.options.length > 0}
          <span id={optionsLabelId} class="sr-only">Answer options</span>
        {/if}
        <!-- @ds slot: options — the option-row list + selection, disabled in guarded states. -->
        <AskQuestionOptionList
          {viewModel}
          selectedOptionIds={stateApi.state.selectedOptionIds}
          disabled={controlsDisabled}
          onToggle={stateApi.selectOption}
        />
        <!-- @ds slot: free-text — optional/required response textarea. -->
        <AskQuestionFreeText
          {viewModel}
          value={stateApi.state.freeText}
          disabled={controlsDisabled}
          invalid={validationVisible}
          onChange={stateApi.setFreeText}
        />
        {#if validationVisible}
          <p
            id={errorId}
            class="ask-question-validation"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {stateApi.validationMessage}
          </p>
        {/if}
        <!-- @ds slot: submit — the guarded one-use submit button; disabled binding preserved. -->
        <AskQuestionSubmitButton disabled={!canAnswer || !stateApi.canSubmit || submitting || terminal} />
      </form>
    {/if}
    <!-- @ds slot: status — live form-state line (sent ✓ · error ! · idle •). -->
    <AskQuestionStatus state={effectiveState} />
    <!-- @ds state: sent — answer accepted by Pi; the immutable ✓ line. -->
    {#if effectiveState.phase === 'answered-immutable' && effectiveState.errorReason === null}
      <p class="ask-question-answered-line" aria-hidden="true">Answer accepted by Pi.</p>
    {/if}
    <!-- @ds slot: read-only-hint — reconnect note shown when the session cannot answer. -->
    {#if !canAnswer && !terminal}
      <p class="ask-question-read-only-hint">Reconnect before submitting an answer.</p>
    {/if}
  </article>
{/if}

<!-- @ds surface: ask-question-card — the question card frame: submit progress bar (+ its keyframes),
     loading state, form column, validation alert, and answered line. Decomposed from style.css; the
     @keyframes moves with the card so Svelte scopes both together. Values unchanged. -->
<style>
  /* @ds surface: ask-question-card — the one-use interactive question card frame. */
  .ask-question-card {
    position: relative;
    display: grid;
    max-inline-size: 100%;
    min-inline-size: 0;
    gap: var(--space-4);
    padding: var(--space-4);
    overflow-wrap: anywhere;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    color: var(--ink);
    scroll-margin-block: var(--space-8);
    overscroll-behavior: contain;
  }

  /* @ds state: submitting — progress bar over the card while the guarded submit is in flight. */
  .ask-question-card-submitting::before {
    position: absolute;
    inset-block-start: -1px;
    inset-inline-start: 0;
    inline-size: 100%;
    block-size: 2px;
    border-radius: inherit;
    background: var(--accent-ink);
    content: '';
    transform-origin: inline-start;
    animation: ask-question-progress 1.2s var(--ease-out-interface) infinite;
  }

  /* @ds guardrail: keyframes — the submitting progress choreography; not designer-editable. */
  @keyframes ask-question-progress {
    0% {
      opacity: 0.45;
      transform: scaleX(0.15);
    }
    55% {
      opacity: 1;
      transform: scaleX(0.72);
    }
    100% {
      opacity: 0.45;
      transform: scaleX(1);
    }
  }

  /* @ds state: loading — display fetch in progress; no interactive controls yet. */
  .ask-question-card-loading {
    min-block-size: 2rem;
    border-color: var(--line);
  }

  /* @ds slot: read-only-hint · @ds state: read-only — note when this authenticated read-only session gates answers. */
  .ask-question-read-only-hint {
    max-inline-size: var(--reading-width);
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  /* @ds slot: form — the answer controls column; the guarded one-use submit lives here. */
  .ask-question-form {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-4);
  }

  /* @ds slot: validation · @ds state: error — the assertive alert for a validation problem. */
  .ask-question-validation {
    margin: 0;
    color: var(--accent-ink);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  /* @ds slot: answered-line · @ds state: sent — the "Answer accepted by Pi." line (accent-inked). */
  .ask-question-answered-line {
    margin: 0;
    color: var(--accent-ink);
    font-family: var(--font-display);
    font-size: 1rem;
  }

  @media (max-width: 30rem) {
    .ask-question-card {
      padding: var(--space-3);
      gap: var(--space-3);
    }
  }

  /* @ds guardrail: do-not-edit — reduced-motion collapses card + submit animation/transition. */
  @media (prefers-reduced-motion: reduce) {
    .ask-question-card {
      animation: none !important;
      transition: none !important;
    }

    .ask-question-card-submitting::before {
      display: none;
      animation: none !important;
    }
  }
</style>
