<script module lang="ts">
  import {
    safeAskQuestionStatusMessage,
    type AskQuestionFormState,
  } from '../../../features/ask-question/askQuestionTypes.js';

  export interface AskQuestionStatusProps {
    readonly state: AskQuestionFormState;
  }
</script>

<script lang="ts">
  let { state }: AskQuestionStatusProps = $props();

  const message = $derived(safeAskQuestionStatusMessage(state.phase, state.errorReason));
  const statusClass = $derived(state.phase === 'error' ? 'ask-question-status-error' : '');
</script>

<!-- @ds slot: status — the live form-state line; phases sent (✓) · error (!) · idle (•). -->
<div class={`ask-question-status ${statusClass}`} role="status" aria-live="polite">
  <!-- @ds slot: status-mark — the per-phase glyph. -->
  <span class="ask-question-status-mark" aria-hidden="true">
    {state.phase === 'answered-immutable' ? '✓' : state.phase === 'error' ? '!' : '•'}
  </span>
  <span>{message}</span>
</div>
