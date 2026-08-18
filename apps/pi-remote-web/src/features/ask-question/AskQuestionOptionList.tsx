import type { AskQuestionViewModel } from './askQuestionTypes.js';
import { AskQuestionOptionRow } from './AskQuestionOptionRow.js';

export interface AskQuestionOptionListProps {
  readonly viewModel: AskQuestionViewModel;
  readonly selectedOptionIds: readonly string[];
  readonly disabled: boolean;
  readonly onToggle: (optionId: string) => void;
}

export function AskQuestionOptionList({
  viewModel,
  selectedOptionIds,
  disabled,
  onToggle,
}: AskQuestionOptionListProps) {
  if (viewModel.display.options.length === 0) return null;
  const selected = new Set(selectedOptionIds);
  const selectionLabel = viewModel.selectionMode === 'single' ? 'Choose one' : 'Choose one or more';
  return (
    <fieldset className="ask-question-options" disabled={disabled}>
      <legend>{selectionLabel}</legend>
      <div className="ask-question-option-list">
        {viewModel.display.options.map((option) => (
          <AskQuestionOptionRow
            key={option.id}
            option={option}
            selected={selected.has(option.id)}
            selectionMode={viewModel.selectionMode}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </fieldset>
  );
}
