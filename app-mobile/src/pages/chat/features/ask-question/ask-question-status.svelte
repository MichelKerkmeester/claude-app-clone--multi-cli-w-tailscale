<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION STATUS
  // ───────────────────────────────────────────────────────────────────

  import {
    safeAskQuestionStatusMessage,
    type AskQuestionFormState,
  } from './ask-question-types.js';

  export interface AskQuestionStatusProps {
    readonly state: AskQuestionFormState;
  }
</script>

<script lang="ts">
  import './ask-question-status.css';
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

<!-- @ds surface: ask-question status — the live form-state line + phase glyph. Decomposed into this co-located CSS file;
     the sent tint is driven by the card's answered-immutable state via :global(...) ancestor. Values unchanged. -->
