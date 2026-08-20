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
