<script module lang="ts">
  import {
    safeAskQuestionStatusMessage,
    type AskQuestionFormState,
  } from './ask-question-types.js';

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

<!-- @ds surface: ask-question status — the live form-state line + phase glyph. Decomposed into this scoped block;
     the sent tint is driven by the card's answered-immutable state via :global(...) ancestor. Values unchanged. -->
<style>
  /* @ds slot: status — the live form-state line. */
  .ask-question-status {
    display: flex;
    min-block-size: 1.5rem;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.8rem;
    line-height: 1.4;
  }

  /* @ds slot: status-mark — the per-phase glyph (sent ✓ · error ! · idle •). */
  .ask-question-status-mark {
    display: inline-grid;
    flex: 0 0 1.25rem;
    block-size: 1.25rem;
    inline-size: 1.25rem;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 750;
  }

  /* @ds state: sent — answered-and-immutable; the status tints to accent (the card sets the state class). */
  :global(.ask-question-card-answered-immutable) .ask-question-status {
    color: var(--accent-ink);
  }

  /* @ds state: error — the status line signals a failed state. */
  .ask-question-status-error {
    color: var(--accent-ink);
  }
</style>
