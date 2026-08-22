<script module lang="ts">
  export interface AskQuestionSubmitButtonProps {
    readonly disabled: boolean;
  }
</script>

<script lang="ts">
  let { disabled }: AskQuestionSubmitButtonProps = $props();
</script>

<!-- @ds slot: submit — the form's guarded one-use submit button; disabled binding preserved. -->
<button type="submit" class="ask-question-submit" {disabled}>Submit answer</button>

<!-- @ds surface: ask-question submit — the guarded one-use submit button. Decomposed into this scoped block;
     native :focus-visible/:disabled preserved (the shared ring/disabled groups split to this control). Values unchanged. -->
<style>
  /* @ds slot: submit — the guarded one-use submit button; disabled binding preserved. */
  .ask-question-submit {
    min-block-size: 44px;
    min-inline-size: 44px;
    justify-self: start;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--action-bg);
    border-radius: var(--radius-control);
    background: var(--action-bg);
    color: var(--action-fg);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
    scroll-margin-block: var(--space-8);
  }

  /* @ds guardrail: focus-visible — the shared AA focus ring across option rows, free text, and submit. */
  .ask-question-submit:focus-visible {
    outline: 3px solid var(--accent-ink);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--surface-raised);
  }

  /* @ds state: disabled — submit fails-closed to reduced emphasis. */
  .ask-question-submit:disabled {
    cursor: default;
    opacity: 0.58;
  }

  @media (max-width: 30rem) {
    .ask-question-submit {
      inline-size: 100%;
    }
  }

  /* @ds guardrail: do-not-edit — reduced-motion collapses submit animation/transition. */
  @media (prefers-reduced-motion: reduce) {
    .ask-question-submit {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
