<script module lang="ts">
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
