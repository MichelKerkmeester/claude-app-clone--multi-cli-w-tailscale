<script module lang="ts">
  // This module holds the shared Ask Question Free Text types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION FREE TEXT
  // ───────────────────────────────────────────────────────────────────

  import type { AskQuestionViewModel } from './ask-question-types.js';

  export interface AskQuestionFreeTextProps {
    readonly viewModel: AskQuestionViewModel;
    readonly value: string;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly onChange: (value: string) => void;
  }
</script>

<script lang="ts">
  let { viewModel, value, disabled, invalid, onChange }: AskQuestionFreeTextProps = $props();

  const fieldId = $derived(`ask-question-free-text-${viewModel.questionId}-${viewModel.revision}`);
</script>

<!-- Component content -->
{#if viewModel.display.freeText.allowed}
  <!-- This slot: free-text — optional/required response textarea + optional character count. -->
  <div class="ask-question-free-text">
    <label for={fieldId}>
      {viewModel.display.freeText.required ? 'Your response' : 'Additional context'}
    </label>
    <!-- This slot: textarea — the response input; invalid (error) state handled in CSS. -->
    <textarea
      id={fieldId}
      value={value}
      rows={3}
      maxlength={viewModel.display.freeText.maxLength}
      placeholder={viewModel.display.freeText.placeholder}
      {disabled}
      aria-invalid={invalid}
      oninput={(event) => onChange(event.currentTarget.value)}
    ></textarea>
    {#if viewModel.display.freeText.maxLength !== undefined}
      <span class="ask-question-free-text--count">
        {value.length}/{viewModel.display.freeText.maxLength}
      </span>
    {/if}
  </div>
{/if}

<!-- Ask question free text -->
<!-- This surface: ask-question free-text — the response textarea + optional character count. Decomposed into this scoped block;
     native aria-invalid/:focus-visible/:disabled preserved. Values unchanged. -->
<style>
  /* This slot: free-text — the response textarea + optional character count. */
  .ask-question-free-text {
    display: grid;
    position: relative;
    gap: var(--space-2);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .ask-question-free-text label {
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 650;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .ask-question-free-text textarea {
    min-block-size: 5rem;
    min-inline-size: 0;
    resize: vertical;
    padding: var(--space-3);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    line-height: 1.45;
    scroll-margin-block: var(--space-8);
  }

  /* This state: error (aria-invalid) — invalid free-text input. */
  .ask-question-free-text textarea[aria-invalid='true'] {
    border-color: var(--accent-ink);
  }

  /* Do not edit — focus-visible — The shared AA focus ring across option rows, free text, and submit. */
  .ask-question-free-text textarea:focus-visible {
    outline: 3px solid var(--accent-ink);
    outline-offset: 3px;
    box-shadow: 0 0 0 1px var(--surface-raised);
  }

  /* This state: disabled — free text fails-closed to reduced emphasis. */
  .ask-question-free-text textarea:disabled {
    cursor: default;
    opacity: 0.58;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .ask-question-free-text--count {
    justify-self: end;
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }
</style>
