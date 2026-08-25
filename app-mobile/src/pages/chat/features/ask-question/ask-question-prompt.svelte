<script module lang="ts">
  // This module holds the shared Ask Question Prompt types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASK QUESTION PROMPT
  // ───────────────────────────────────────────────────────────────────

  import type { AskQuestionViewModel } from './ask-question-types.js';

  export interface AskQuestionPromptProps {
    readonly viewModel: AskQuestionViewModel;
  }
</script>

<script lang="ts">
  let { viewModel }: AskQuestionPromptProps = $props();
</script>

<!-- Component content -->
<!-- This slot: prompt — the question eyebrow + display headline. -->
<div class="ask-question--prompt">
  <!-- This slot: kicker — the "Pi asks" eyebrow. -->
  <p class="ask-question--eyebrow">Pi asks</p>
  <h2>{viewModel.display.prompt}</h2>
</div>

<!-- Ask question prompt -->
<!-- This surface: ask-question prompt — eyebrow + display headline. Decomposed into this scoped block; values unchanged. -->
<style>
  /* This slot: prompt — the question eyebrow + display headline. */
  .ask-question--prompt {
    display: grid;
    gap: var(--space-1);
  }

  /* This slot: kicker — the "Pi asks" eyebrow. */
  .ask-question--eyebrow {
    margin: 0;
    color: var(--accent-ink);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .ask-question--prompt h2 {
    max-inline-size: var(--reading-width);
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.15rem, 3vw, 1.45rem);
    font-weight: 400;
    line-height: 1.35;
    overflow-wrap: anywhere;
    text-wrap: pretty;
  }
</style>
