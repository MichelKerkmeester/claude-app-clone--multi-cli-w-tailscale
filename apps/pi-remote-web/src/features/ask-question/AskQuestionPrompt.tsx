import type { AskQuestionViewModel } from './askQuestionTypes.js';

export function AskQuestionPrompt({ viewModel }: { readonly viewModel: AskQuestionViewModel }) {
  return (
    <div className="ask-question-prompt">
      <p className="ask-question-kicker">Pi asks</p>
      <h2>{viewModel.display.prompt}</h2>
    </div>
  );
}
