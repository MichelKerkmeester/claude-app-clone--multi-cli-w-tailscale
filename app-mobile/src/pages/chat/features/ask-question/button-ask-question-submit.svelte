<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION SUBMIT BUTTON
  // ───────────────────────────────────────────────────────────────────

  export interface AskQuestionSubmitButtonProps {
    readonly disabled: boolean;
  }
</script>

<script lang="ts">
  import './button-ask-question-submit.css';
  let { disabled }: AskQuestionSubmitButtonProps = $props();
</script>

<!-- @ds slot: submit — the form's guarded one-use submit button; disabled binding preserved. -->
<button type="submit" class="ask-question-submit" {disabled}>Submit answer</button>

<!-- @ds surface: ask-question submit — the guarded one-use submit button. Decomposed into this co-located CSS file;
     native :focus-visible/:disabled preserved (the shared ring/disabled groups split to this control). Values unchanged. -->
