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
  // @ds slot: options — the choice fieldset; legend + the stacked option-row list.
  return (
    <fieldset className="ask-question-options" disabled={disabled}>
      <legend>{selectionLabel}</legend>
      {/* @ds slot: option-list — the stacked option rows. */}
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
