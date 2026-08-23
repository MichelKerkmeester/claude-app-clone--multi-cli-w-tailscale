<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION OPTION ROW
  // ───────────────────────────────────────────────────────────────────

  import type { AskQuestionOption } from '@pi-remote/pi-rpc-protocol';

  export interface AskQuestionOptionRowProps {
    readonly option: AskQuestionOption;
    readonly selected: boolean;
    readonly selectionMode: 'single' | 'multiple';
    readonly disabled: boolean;
    readonly onToggle: (optionId: string) => void;
  }
</script>

<script lang="ts">
  let { option, selected, selectionMode, disabled, onToggle }: AskQuestionOptionRowProps = $props();
</script>

<!-- @ds slot: option-row — one answer option; states idle · hover · pressed · selected · disabled. -->
<button
  type="button"
  class="ask-question-option-row"
  aria-pressed={selected}
  aria-label={option.label}
  {disabled}
  onclick={() => onToggle(option.id)}
>
  <!-- @ds slot: option-indicator — single (circle) / multiple (square) selection glyph. -->
  <span
    class={`ask-question-option-indicator ask-question-option-indicator-${selectionMode}`}
    aria-hidden="true"
  >
    {selected ? '✓' : ''}
  </span>
  <!-- @ds slot: option-copy — the option label + optional description. -->
  <span class="ask-question-option-copy">
    <span class="ask-question-option-label">{option.label}</span>
    {#if option.description !== undefined}
      <span class="ask-question-option-description">{option.description}</span>
    {/if}
  </span>
</button>

<!-- @ds surface: ask-question option-row — one answer option. Decomposed into this scoped block; native
     :hover/:focus-visible/:disabled and the aria-pressed selected state preserved; the dark-theme
     selected re-ink uses :global(:root[data-theme='dark']). Values unchanged. -->
<style>
  /* @ds slot: option-row · @ds state: idle — one answer option; hover/pressed/selected/disabled follow. */
  .ask-question-option-row {
    display: flex;
    min-block-size: 44px;
    min-inline-size: 0;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: start;
    cursor: pointer;
    touch-action: manipulation;
  }

  /* @ds state: hover — the option row under pointer hover. */
  .ask-question-option-row:hover:not(:disabled) {
    border-color: var(--accent-ink);
    background: var(--accent-soft);
  }

  /* @ds state: selected (aria-pressed) — the chosen option row. */
  .ask-question-option-row[aria-pressed='true'] {
    border-color: var(--ink);
    background: var(--surface-code);
    color: var(--ink-inverse);
  }

  /* @ds guardrail: focus-visible — The shared AA focus ring across option rows, free text, and submit. */
  .ask-question-option-row:focus-visible {
    outline: 3px solid var(--accent-ink);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--surface-raised);
  }

  /* @ds state: disabled — option rows fail-closed to reduced emphasis. */
  .ask-question-option-row:disabled {
    cursor: default;
    opacity: 0.58;
  }

  /* @ds slot: option-indicator — single (circle) / multiple (square) selection glyph. */
  .ask-question-option-indicator {
    display: grid;
    flex: 0 0 1.25rem;
    block-size: 1.25rem;
    inline-size: 1.25rem;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 0.3rem;
    font-size: 0.8rem;
    font-weight: 750;
    line-height: 1;
  }

  /* @ds variant: indicator-single — circular single-choice glyph. */
  .ask-question-option-indicator-single {
    border-radius: 999px;
  }

  /* @ds slot: option-copy — the option label + optional description. */
  .ask-question-option-copy {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-1);
  }

  .ask-question-option-label,
  .ask-question-option-description {
    overflow-wrap: anywhere;
  }

  .ask-question-option-label {
    font-weight: 650;
    line-height: 1.35;
  }

  .ask-question-option-description {
    color: var(--ink-muted);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  /* @ds state: selected · description — re-ink the description inside a selected row. */
  .ask-question-option-row[aria-pressed='true'] .ask-question-option-description {
    color: inherit;
    opacity: 0.82;
  }

  /* @ds guardrail: do-not-edit — Reduced-motion collapses option-row animation/transition. */
  @media (prefers-reduced-motion: reduce) {
    .ask-question-option-row {
      animation: none !important;
      transition: none !important;
    }
  }

  /* @ds state: selected · dark — dark-theme selected row re-inks to base ink. */
  :global(:root[data-theme='dark']) .ask-question-option-row[aria-pressed='true'] {
    color: var(--ink);
  }
</style>
