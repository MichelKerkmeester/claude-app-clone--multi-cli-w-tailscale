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
  // @ds slot: option-row — one answer option; states idle · hover · pressed · selected · disabled.
  return (
    <button
      type="button"
      className="ask-question-option-row"
      aria-pressed={selected}
      aria-label={option.label}
      disabled={disabled}
      onClick={() => onToggle(option.id)}
    >
      {/* @ds slot: option-indicator — single (circle) / multiple (square) selection glyph. */}
      <span
        className={`ask-question-option-indicator ask-question-option-indicator-${selectionMode}`}
        aria-hidden="true"
      >
        {selected ? '✓' : ''}
      </span>
      {/* @ds slot: option-copy — the option label + optional description. */}
      <span className="ask-question-option-copy">
        <span className="ask-question-option-label">{option.label}</span>
        {option.description !== undefined && (
          <span className="ask-question-option-description">{option.description}</span>
        )}
      </span>
    </button>
  );
}
