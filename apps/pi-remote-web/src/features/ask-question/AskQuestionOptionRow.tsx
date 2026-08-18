import type { AskQuestionOption } from '@pi-remote/pi-rpc-protocol';

export interface AskQuestionOptionRowProps {
  readonly option: AskQuestionOption;
  readonly selected: boolean;
  readonly selectionMode: 'single' | 'multiple';
  readonly disabled: boolean;
  readonly onToggle: (optionId: string) => void;
}

export function AskQuestionOptionRow({
  option,
  selected,
  selectionMode,
  disabled,
  onToggle,
}: AskQuestionOptionRowProps) {
  return (
    <button
      type="button"
      className="ask-question-option-row"
      aria-pressed={selected}
      aria-label={option.label}
      disabled={disabled}
      onClick={() => onToggle(option.id)}
    >
      <span
        className={`ask-question-option-indicator ask-question-option-indicator-${selectionMode}`}
        aria-hidden="true"
      >
        {selected ? '✓' : ''}
      </span>
      <span className="ask-question-option-copy">
        <span className="ask-question-option-label">{option.label}</span>
        {option.description !== undefined && (
          <span className="ask-question-option-description">{option.description}</span>
        )}
      </span>
    </button>
  );
}
