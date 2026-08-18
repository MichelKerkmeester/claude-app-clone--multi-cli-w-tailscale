export interface AskQuestionSubmitButtonProps {
  readonly disabled: boolean;
}

export function AskQuestionSubmitButton({
  disabled,
}: AskQuestionSubmitButtonProps) {
  return (
    <button
      type="submit"
      className="ask-question-submit"
      disabled={disabled}
    >
      Submit answer
    </button>
  );
}
