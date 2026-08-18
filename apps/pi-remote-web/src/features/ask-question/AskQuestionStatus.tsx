import {
  safeAskQuestionStatusMessage,
  type AskQuestionFormState,
} from './askQuestionTypes.js';

export function AskQuestionStatus({ state }: { readonly state: AskQuestionFormState }) {
  const message = safeAskQuestionStatusMessage(state.phase, state.errorReason);
  const statusClass = state.phase === 'error' ? 'ask-question-status-error' : '';
  return (
    <div className={`ask-question-status ${statusClass}`} role="status" aria-live="polite">
      <span className="ask-question-status-mark" aria-hidden="true">
        {state.phase === 'answered-immutable' ? '✓' : state.phase === 'error' ? '!' : '•'}
      </span>
      <span>{message}</span>
    </div>
  );
}
