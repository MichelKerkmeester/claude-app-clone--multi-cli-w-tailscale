<script module lang="ts">
  import type { AskQuestionViewModel } from '../../../features/ask-question/askQuestionTypes.js';

  export interface AskQuestionOptionListProps {
    readonly viewModel: AskQuestionViewModel;
    readonly selectedOptionIds: readonly string[];
    readonly disabled: boolean;
    readonly onToggle: (optionId: string) => void;
  }
</script>

<script lang="ts">
  import AskQuestionOptionRow from './AskQuestionOptionRow.svelte';

  let { viewModel, selectedOptionIds, disabled, onToggle }: AskQuestionOptionListProps = $props();

  const selected = $derived(new Set(selectedOptionIds));
  const selectionLabel = $derived(
    viewModel.selectionMode === 'single' ? 'Choose one' : 'Choose one or more',
  );
</script>

{#if viewModel.display.options.length > 0}
  <!-- @ds slot: options — the choice fieldset; legend + the stacked option-row list. -->
  <fieldset class="ask-question-options" {disabled}>
    <legend>{selectionLabel}</legend>
    <!-- @ds slot: option-list — the stacked option rows. -->
    <div class="ask-question-option-list">
      {#each viewModel.display.options as option (option.id)}
        <AskQuestionOptionRow
          {option}
          selected={selected.has(option.id)}
          selectionMode={viewModel.selectionMode}
          {disabled}
          {onToggle}
        />
      {/each}
    </div>
  </fieldset>
{/if}
