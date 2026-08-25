// ───────────────────────────────────────────────────────────────────
// MODULE: Ask-Question Form State
// ───────────────────────────────────────────────────────────────────

import type {
  AskQuestionAnswer,
  AskQuestionAnswerResult,
  AskQuestionResultReason,
} from '@pi-remote/pi-rpc-protocol';

import {
  askQuestionDraftAsAnswer,
  getAskQuestionEphemeralEntry,
  setAskQuestionDraft,
} from './ask-question-ephemeral-store.js';
import {
  askQuestionKey,
  isAskQuestionTerminalState,
  isAskQuestionTerminalReason,
  transcriptStatusToUiState,
  uiStateForAskQuestionReason,
  type AskQuestionFormState,
  type AskQuestionSubmitIntent,
  type AskQuestionUiState,
  type AskQuestionViewModel,
} from './ask-question-types.js';

// ───────────────────────────────────────────────────────────────────
// 1. PUBLIC API TYPES
// ───────────────────────────────────────────────────────────────────

export interface AskQuestionStateOptions {
  readonly initialState?: AskQuestionUiState;
}

export interface AskQuestionStateApi {
  readonly state: AskQuestionFormState;
  readonly canSubmit: boolean;
  readonly validationMessage: string | null;
  readonly selectOption: (optionId: string) => void;
  readonly setFreeText: (value: string) => void;
  readonly beginSubmit: () => AskQuestionSubmitIntent | null;
  readonly resolveResult: (result: AskQuestionAnswerResult) => void;
  readonly applyTranscriptStatus: (
    status: Parameters<typeof transcriptStatusToUiState>[0],
  ) => void;
}

type AskQuestionAction =
  | { readonly type: 'reset'; readonly viewModel: AskQuestionViewModel | null; readonly initialState?: AskQuestionUiState }
  | { readonly type: 'select'; readonly optionId: string }
  | { readonly type: 'free-text'; readonly value: string }
  | { readonly type: 'submit'; readonly clientMutationId: string }
  | { readonly type: 'result'; readonly result: AskQuestionAnswerResult }
  | { readonly type: 'transcript-status'; readonly state: AskQuestionUiState };

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const EMPTY_STATE: AskQuestionFormState = {
  phase: 'presented',
  selectedOptionIds: [],
  freeText: '',
  errorReason: null,
  clientMutationId: null,
};

let mutationSequence = 0;

function askQuestionIdentity(viewModel: AskQuestionViewModel | null): string | null {
  return viewModel === null ? null : askQuestionKey(viewModel.questionId, viewModel.revision);
}

// ───────────────────────────────────────────────────────────────────
// 3. STATE CREATION AND VALIDATION
// ───────────────────────────────────────────────────────────────────

export function createAskQuestionState(
  viewModel: AskQuestionViewModel | null,
  initialState: AskQuestionUiState | undefined = undefined,
): AskQuestionFormState {
  if (viewModel === null) return EMPTY_STATE;
  const key = askQuestionKey(viewModel.questionId, viewModel.revision);
  const draft = getAskQuestionEphemeralEntry(viewModel.questionId, viewModel.revision)?.draft;
  const phase = initialState ?? 'presented';
  return {
    phase,
    selectedOptionIds: draft?.selectedOptionIds ?? [],
    freeText: draft?.freeText ?? '',
    errorReason: phase === 'error' ? 'validation-failed' : null,
    clientMutationId: phase === 'submitting' ? `demo_mutation_${key}` : null,
  };
}

export function validateAskQuestionAnswer(
  viewModel: AskQuestionViewModel | null,
  selectedOptionIds: readonly string[],
  freeText: string,
): { readonly valid: boolean; readonly message: string | null } {
  if (viewModel === null) return { valid: false, message: 'Question content is loading.' };
  const { display, selectionMode } = viewModel;
  const optionIds = new Set(display.options.map((option) => option.id));
  if (selectedOptionIds.some((optionId) => !optionIds.has(optionId))) {
    return { valid: false, message: 'Choose an available option.' };
  }
  const minimum = display.minSelections ?? (display.options.length > 0 ? 1 : 0);
  const maximum =
    display.maxSelections ?? (selectionMode === 'single' ? 1 : display.options.length);
  if (selectedOptionIds.length < minimum) {
    return { valid: false, message: 'Select at least one option.' };
  }
  if (selectedOptionIds.length > maximum) {
    return { valid: false, message: 'Select fewer options.' };
  }
  if (selectionMode === 'single' && selectedOptionIds.length > 1) {
    return { valid: false, message: 'Select one option.' };
  }
  if (!display.freeText.allowed && freeText.length > 0) {
    return { valid: false, message: 'Free text is not available for this question.' };
  }
  if (display.freeText.required && freeText.trim().length === 0) {
    return { valid: false, message: 'Enter a response before submitting.' };
  }
  if (display.freeText.maxLength !== undefined && freeText.length > display.freeText.maxLength) {
    return { valid: false, message: 'Keep the response within the displayed limit.' };
  }
  if (new TextEncoder().encode(freeText).byteLength > 8 * 1_024) {
    return { valid: false, message: 'Keep the response within the protocol limit.' };
  }
  // Mirror protocol control/bidi guard locally so users can fix input without a round trip.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(freeText)) {
    return { valid: false, message: 'Use plain text without control characters.' };
  }
  if (selectedOptionIds.length === 0 && freeText.trim().length === 0) {
    return { valid: false, message: 'Choose an option or enter a response.' };
  }
  return { valid: true, message: null };
}

// ───────────────────────────────────────────────────────────────────
// 4. FORM STATE REDUCER
// ───────────────────────────────────────────────────────────────────

export function askQuestionStateReducer(
  state: AskQuestionFormState,
  action: AskQuestionAction,
  viewModel: AskQuestionViewModel | null,
): AskQuestionFormState {
  switch (action.type) {
    case 'reset':
      return createAskQuestionState(action.viewModel, action.initialState);
    case 'select': {
      if (viewModel === null || isAskQuestionTerminalState(state.phase) || state.phase === 'submitting') {
        return state;
      }
      if (!viewModel.display.options.some((option) => option.id === action.optionId)) return state;
      const selected =
        viewModel.selectionMode === 'single'
          ? [action.optionId]
          : state.selectedOptionIds.includes(action.optionId)
            ? state.selectedOptionIds.filter((optionId) => optionId !== action.optionId)
            : [...state.selectedOptionIds, action.optionId];
      const phase = selected.length === 0 && state.freeText.length === 0 ? 'presented' : 'selecting';
      return {
        ...state,
        phase,
        selectedOptionIds: selected,
        errorReason: null,
        clientMutationId: null,
      };
    }
    case 'free-text': {
      if (viewModel === null || isAskQuestionTerminalState(state.phase) || state.phase === 'submitting') {
        return state;
      }
      const maxLength = viewModel.display.freeText.maxLength;
      const value =
        maxLength === undefined ? action.value : action.value.slice(0, maxLength);
      const phase = value.length === 0 && state.selectedOptionIds.length === 0 ? 'presented' : 'selecting';
      return {
        ...state,
        phase,
        freeText: value,
        errorReason: null,
        clientMutationId: null,
      };
    }
    case 'submit':
      if (state.phase === 'submitting' || isAskQuestionTerminalState(state.phase)) return state;
      return {
        ...state,
        phase: 'submitting',
        clientMutationId: action.clientMutationId,
        errorReason: null,
      };
    case 'result': {
      if (
        state.phase !== 'submitting' ||
        state.clientMutationId === null ||
        state.clientMutationId !== action.result.clientMutationId
      ) {
        return state;
      }
      if (action.result.status === 'accepted') {
        return {
          ...state,
          phase: 'answered-immutable',
          selectedOptionIds: [],
          freeText: '',
          errorReason: null,
        };
      }
      const reason = action.result.reason ?? 'host-unavailable';
      const terminalState = uiStateForAskQuestionReason(reason);
      if (terminalState !== null) {
        return {
          ...state,
          phase: terminalState,
          selectedOptionIds: [],
          freeText: '',
          errorReason: reason,
        };
      }
      return { ...state, phase: 'error', errorReason: reason };
    }
    case 'transcript-status': {
      if (action.state === 'presented' && state.phase === 'error') {
        return { ...state, phase: 'error' };
      }
      if (action.state === 'submitting' && state.phase !== 'submitting') return state;
      if (action.state === 'answered-immutable' || action.state === 'expired' || action.state === 'superseded' || action.state === 'delivery-unknown') {
        return {
          ...state,
          phase: action.state,
          selectedOptionIds: [],
          freeText: '',
        };
      }
      return state;
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function nextMutationId(): string {
  mutationSequence += 1;
  const random = globalThis.crypto?.randomUUID?.().replaceAll('-', '_');
  return `ask_mutation_${random ?? `${Date.now()}_${mutationSequence}`}`;
}

// ───────────────────────────────────────────────────────────────────
// 6. REACTIVE HOOK
// ───────────────────────────────────────────────────────────────────

export function useAskQuestionState(
  getViewModel: () => AskQuestionViewModel | null,
  getInitialState: () => AskQuestionUiState | undefined = () => undefined,
): AskQuestionStateApi {
  let formState = $state<AskQuestionFormState>(
    createAskQuestionState(getViewModel(), getInitialState()),
  );
  let identityRef: string | null = askQuestionIdentity(getViewModel());

  function dispatch(action: AskQuestionAction): void {
    formState = askQuestionStateReducer(formState, action, getViewModel());
  }

  $effect(() => {
    const vm = getViewModel();
    const identity = askQuestionIdentity(vm);
    if (identityRef === identity) return;
    identityRef = identity;
    formState = createAskQuestionState(vm, getInitialState());
  });

  const validation = $derived(
    validateAskQuestionAnswer(getViewModel(), formState.selectedOptionIds, formState.freeText),
  );
  const canSubmit = $derived(
    validation.valid &&
      formState.phase !== 'submitting' &&
      !isAskQuestionTerminalState(formState.phase),
  );

  function selectOption(optionId: string): void {
    dispatch({ type: 'select', optionId });
    const vm = getViewModel();
    if (vm !== null) {
      setAskQuestionDraft(vm.questionId, vm.revision, {
        selectedOptionIds: formState.selectedOptionIds,
        freeText: formState.freeText,
      });
    }
  }

  function setFreeText(value: string): void {
    dispatch({ type: 'free-text', value });
    const vm = getViewModel();
    if (vm !== null) {
      setAskQuestionDraft(vm.questionId, vm.revision, {
        selectedOptionIds: formState.selectedOptionIds,
        freeText: formState.freeText,
      });
    }
  }

  function beginSubmit(): AskQuestionSubmitIntent | null {
    const vm = getViewModel();
    const currentValidation = validateAskQuestionAnswer(
      vm,
      formState.selectedOptionIds,
      formState.freeText,
    );
    if (
      !currentValidation.valid ||
      formState.phase === 'submitting' ||
      isAskQuestionTerminalState(formState.phase)
    ) {
      return null;
    }
    const clientMutationId = nextMutationId();
    const answer = askQuestionDraftAsAnswer({
      selectedOptionIds: formState.selectedOptionIds,
      freeText: formState.freeText,
    });
    dispatch({ type: 'submit', clientMutationId });
    return { clientMutationId, answer };
  }

  function resolveResult(result: AskQuestionAnswerResult): void {
    dispatch({ type: 'result', result });
  }

  function applyTranscriptStatus(
    status: Parameters<typeof transcriptStatusToUiState>[0],
  ): void {
    dispatch({ type: 'transcript-status', state: transcriptStatusToUiState(status) });
  }

  return {
    get state() {
      return formState;
    },
    get canSubmit() {
      return canSubmit;
    },
    get validationMessage() {
      return validation.valid ? null : validation.message;
    },
    selectOption,
    setFreeText,
    beginSubmit,
    resolveResult,
    applyTranscriptStatus,
  };
}

// ───────────────────────────────────────────────────────────────────
// 7. EXPORTED UTILITIES
// ───────────────────────────────────────────────────────────────────

export function isRetryableAskQuestionReason(reason: AskQuestionResultReason): boolean {
  return !isAskQuestionTerminalReason(reason);
}

export function answerFromAskQuestionState(state: AskQuestionFormState): AskQuestionAnswer {
  return askQuestionDraftAsAnswer({
    selectedOptionIds: state.selectedOptionIds,
    freeText: state.freeText,
  });
}
