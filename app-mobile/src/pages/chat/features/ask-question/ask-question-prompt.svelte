<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION PROMPT
  // ───────────────────────────────────────────────────────────────────

  import type { AskQuestionViewModel } from './ask-question-types.js';

  export interface AskQuestionPromptProps {
    readonly viewModel: AskQuestionViewModel;
  }
</script>

<script lang="ts">
  import './ask-question-prompt.css';
  let { viewModel }: AskQuestionPromptProps = $props();
</script>

<!-- @ds slot: prompt — the question eyebrow + display headline. -->
<div class="ask-question-prompt">
  <!-- @ds slot: kicker — the "Pi asks" eyebrow. -->
  <p class="ask-question-kicker">Pi asks</p>
  <h2>{viewModel.display.prompt}</h2>
</div>

<!-- @ds surface: ask-question prompt — eyebrow + display headline. Decomposed into this co-located CSS file; values unchanged. -->
