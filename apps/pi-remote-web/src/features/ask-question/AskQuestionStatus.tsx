import {
  safeAskQuestionStatusMessage,
  type AskQuestionFormState,
} from './askQuestionTypes.js';

export function AskQuestionStatus({ state }: { readonly state: AskQuestionFormState }) {
  const message = safeAskQuestionStatusMessage(state.phase, state.errorReason);
  const statusClass = state.phase === 'error' ? 'ask-question-status-error' : '';
  // @ds slot: status — the live form-state line; phases sent (✓) · error (!) · idle (•).
  return (
    <div className={`ask-question-status ${statusClass}`} role="status" aria-live="polite">
      {/* @ds slot: status-mark — the per-phase glyph. */}
      <span className="ask-question-status-mark" aria-hidden="true">
        {state.phase === 'answered-immutable' ? '✓' : state.phase === 'error' ? '!' : '•'}
      </span>
      <span>{message}</span>
    </div>
  );
}
