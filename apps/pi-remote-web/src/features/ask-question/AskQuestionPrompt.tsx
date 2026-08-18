import type { AskQuestionViewModel } from './askQuestionTypes.js';

export function AskQuestionPrompt({ viewModel }: { readonly viewModel: AskQuestionViewModel }) {
  // @ds slot: prompt — the question eyebrow + display headline.
  return (
    <div className="ask-question-prompt">
      {/* @ds slot: kicker — the "Pi asks" eyebrow. */}
      <p className="ask-question-kicker">Pi asks</p>
      <h2>{viewModel.display.prompt}</h2>
    </div>
  );
}
