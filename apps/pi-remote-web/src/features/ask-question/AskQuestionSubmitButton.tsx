export interface AskQuestionSubmitButtonProps {
  readonly disabled: boolean;
}

export function AskQuestionSubmitButton({
  disabled,
}: AskQuestionSubmitButtonProps) {
  // @ds slot: submit — the form's guarded one-use submit button; disabled binding preserved.
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
