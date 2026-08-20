<script module lang="ts">
  import type { AskQuestionViewModel } from '../../../features/ask-question/askQuestionTypes.js';

  export interface AskQuestionPromptProps {
    readonly viewModel: AskQuestionViewModel;
  }
</script>

<script lang="ts">
  let { viewModel }: AskQuestionPromptProps = $props();
</script>

<!-- @ds slot: prompt — the question eyebrow + display headline. -->
<div class="ask-question-prompt">
  <!-- @ds slot: kicker — the "Pi asks" eyebrow. -->
  <p class="ask-question-kicker">Pi asks</p>
  <h2>{viewModel.display.prompt}</h2>
</div>
