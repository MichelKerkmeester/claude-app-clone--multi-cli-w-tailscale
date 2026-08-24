<script module lang="ts">
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
  import './ask-question-free-text.css';
  let { viewModel, value, disabled, invalid, onChange }: AskQuestionFreeTextProps = $props();

  const fieldId = $derived(`ask-question-free-text-${viewModel.questionId}-${viewModel.revision}`);
</script>

{#if viewModel.display.freeText.allowed}
  <!-- @ds slot: free-text — optional/required response textarea + optional character count. -->
  <div class="ask-question-free-text">
    <label for={fieldId}>
      {viewModel.display.freeText.required ? 'Your response' : 'Additional context'}
    </label>
    <!-- @ds slot: textarea — the response input; invalid (error) state handled in CSS. -->
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
      <span class="ask-question-free-text-count">
        {value.length}/{viewModel.display.freeText.maxLength}
      </span>
    {/if}
  </div>
{/if}

<!-- @ds surface: ask-question free-text — the response textarea + optional character count. Decomposed into this co-located CSS file;
     native aria-invalid/:focus-visible/:disabled preserved. Values unchanged. -->
