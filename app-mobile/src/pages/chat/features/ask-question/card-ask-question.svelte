<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface AskQuestionCardProps {
    readonly block: AskQuestionTranscriptMeta;
    readonly sessionId?: string;
    readonly canAnswer?: boolean;
    readonly principal?: string | undefined;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  let askQuestionUidSequence = 0;
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import { fetchAskQuestionDisplay } from '$shared/transport/relay.js';
  import {
    releaseAskQuestionEphemeral,
    setAskQuestionDisplay,
  } from './ask-question-ephemeral-store.js';
  import {
    isAskQuestionTerminalState,
    toAskQuestionViewModel,
    transcriptStatusToUiState,
    type AskQuestionViewModel,
  } from './ask-question-types.js';
  import AskQuestionFreeText from './ask-question-free-text.svelte';
  import AskQuestionOptionList from './ask-question-option-list.svelte';
  import AskQuestionPrompt from './ask-question-prompt.svelte';
  import AskQuestionStatus from './ask-question-status.svelte';
  import AskQuestionSubmitButton from './button-ask-question-submit.svelte';
  import { useAskQuestionKeyboardNavigation } from './use-ask-question-keyboard-navigation.svelte.js';
  import { useAskQuestionMutation } from './use-ask-question-mutation.svelte.js';
  import { useAskQuestionState } from './use-ask-question-state.svelte.js';

  import './card-ask-question.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, canAnswer = true, principal }: AskQuestionCardProps = $props();

  // @ds surface: ask-question — the one-use interactive question card; slot seams below.
  // @ds guardrail: One-use ticketed, revision-bound, FAIL-CLOSED mutation path. Ticketing, revision binding, non-optimistic submit, and keyboard/a11y wiring live in the hooks and are NOT designer-editable. Only the @ds surface: ask-question CSS is editable.

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

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
     loading state, form column, validation alert, and answered line. Decomposed into this co-located CSS file; the
     @keyframes moves with the card so Svelte scopes both together. Values unchanged. -->
