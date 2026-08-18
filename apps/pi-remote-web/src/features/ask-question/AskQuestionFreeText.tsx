import type { AskQuestionViewModel } from './askQuestionTypes.js';

export interface AskQuestionFreeTextProps {
  readonly viewModel: AskQuestionViewModel;
  readonly value: string;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly onChange: (value: string) => void;
}

export function AskQuestionFreeText({
  viewModel,
  value,
  disabled,
  invalid,
  onChange,
}: AskQuestionFreeTextProps) {
  if (!viewModel.display.freeText.allowed) return null;
  const fieldId = `ask-question-free-text-${viewModel.questionId}-${viewModel.revision}`;
  // @ds slot: free-text — optional/required response textarea + optional character count.
  return (
    <div className="ask-question-free-text">
      <label htmlFor={fieldId}>
        {viewModel.display.freeText.required ? 'Your response' : 'Additional context'}
      </label>
      {/* @ds slot: textarea — the response input; invalid (error) state handled in style.css. */}
      <textarea
        id={fieldId}
        value={value}
        rows={3}
        maxLength={viewModel.display.freeText.maxLength}
        placeholder={viewModel.display.freeText.placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
      {viewModel.display.freeText.maxLength !== undefined && (
        <span className="ask-question-free-text-count">
          {value.length}/{viewModel.display.freeText.maxLength}
        </span>
      )}
    </div>
  );
}
