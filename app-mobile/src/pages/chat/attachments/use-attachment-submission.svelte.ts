// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Attachment Submission State Machine
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  AttachmentClientError,
  cancelAttachmentReservation,
  classifyAttachmentError,
  commitAttachmentSubmission,
  createAttachmentReservation,
  createAttachmentSubmissionId,
  prepareAttachmentTransfers,
  reconcileAttachmentSet,
  uploadPreparedAttachments,
  type AttachmentClientErrorCode,
  type AttachmentSubmissionInputs,
  type AttachmentSubmissionReservation,
} from './attachment-client.js';
import { getAttachmentDraft } from './attachment-draft-provider.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SUBMISSION STATE TYPES
// ───────────────────────────────────────────────────────────────────

export type AttachmentSubmissionPhase =
  | 'waiting-for-connection'
  | 'authorizing'
  | 'uploading'
  | 'server-checking'
  | 'committing'
  | 'sent'
  | 'failed-retryable'
  | 'failed-stale'
  | 'failed-expired'
  | 'canceled'
  | 'delivery-unknown';

export interface AttachmentSubmissionState {
  readonly phase: AttachmentSubmissionPhase;
  readonly submissionId: string | null;
  readonly progress: Readonly<Record<string, number | null>>;
  readonly error: string | null;
}

export interface UseAttachmentSubmissionOptions {
  readonly sessionId: string;
  readonly sessionEpoch: string | null;
  readonly expectedPromptRevision: number | null;
  readonly prompt: string;
  readonly connection: string;
  readonly mediaEnabled: boolean;
  readonly modelCanViewPhotos: boolean;
  readonly runtimeAuthority: boolean;
  readonly onSubmitted?: () => void;
}

export interface AttachmentSubmissionController {
  readonly state: AttachmentSubmissionState;
  readonly busy: boolean;
  readonly submit: (streamingBehavior?: 'steer' | 'followUp') => boolean;
  readonly cancel: () => void;
  readonly retryable: boolean;
  readonly statusMessage: string | null;
}

interface ActiveSubmission {
  readonly generation: number;
  readonly controller: AbortController;
  readonly signature: string;
  readonly input: AttachmentSubmissionInputs;
  reservation: AttachmentSubmissionReservation | null;
  commitStarted: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const IDLE_STATE: AttachmentSubmissionState = {
  phase: 'sent',
  submissionId: null,
  progress: {},
  error: null,
};

const BUSY_PHASES: ReadonlySet<AttachmentSubmissionPhase> = new Set([
  'waiting-for-connection',
  'authorizing',
  'uploading',
  'server-checking',
  'committing',
]);

// ───────────────────────────────────────────────────────────────────
// 4. HOOK STATE AND INVALIDATION
// ───────────────────────────────────────────────────────────────────

export function useAttachmentSubmission(
  getOptions: () => UseAttachmentSubmissionOptions,
): AttachmentSubmissionController {
  const draft = getAttachmentDraft();
  let state = $state<AttachmentSubmissionState>(IDLE_STATE);
  let stateRef: AttachmentSubmissionState = state;
  let generationRef = 0;
  let activeRef: ActiveSubmission | null = null;
  let mountedRef = true;

  const draftSignature = $derived.by(() =>
    draft.state.items
      .map((item) => `${item.id}:${item.ordinal}:${item.status}:${item.preview}`)
      .join('|'),
  );

  function updateState(next: AttachmentSubmissionState): void {
    stateRef = next;
    if (mountedRef) state = next;
  }

  function reconcileAmbiguous(reservation: AttachmentSubmissionReservation): void {
    void reconcileAttachmentSet(reservation).catch(() => undefined);
  }

  function invalidate(phase: 'canceled' | 'failed-stale', message?: string): void {
    const active = activeRef;
    const effectivePhase = active?.commitStarted === true ? 'delivery-unknown' : phase;
    generationRef += 1;
    activeRef = null;
    active?.controller.abort();
    if (active?.reservation !== null && active?.reservation !== undefined) {
      if (active.commitStarted) reconcileAmbiguous(active.reservation);
      else void cancelAttachmentReservation(active.reservation);
    }
    updateState({
      phase: effectivePhase,
      submissionId: active?.input.submissionId ?? stateRef.submissionId,
      progress: {},
      error:
        message ??
        (effectivePhase === 'delivery-unknown'
          ? 'Delivery could not be confirmed. Do not resend automatically.'
          : phase === 'canceled'
            ? 'Photo sending was canceled.'
            : null),
    });
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. GUARD EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    mountedRef = true;
    return () => {
      mountedRef = false;
      const active = activeRef;
      generationRef += 1;
      activeRef = null;
      active?.controller.abort();
      if (active?.reservation !== null && active?.reservation !== undefined) {
        if (active.commitStarted) reconcileAmbiguous(active.reservation);
        else void cancelAttachmentReservation(active.reservation);
      }
    };
  });

  $effect(() => {
    const onLogout = () =>
      invalidate('canceled', 'Photo sending stopped when this device signed out.');
    const onAppLock = () =>
      invalidate('canceled', 'Photo sending stopped when this device locked.');
    const onPageHide = () => invalidate('canceled', 'Photo sending stopped when this page closed.');
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onPageHide();
    };
    window.addEventListener('pi-remote:logout', onLogout);
    window.addEventListener('pi-remote:app-lock', onAppLock);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pi-remote:logout', onLogout);
      window.removeEventListener('pi-remote:app-lock', onAppLock);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  $effect(() => {
    const signature = draftSignature;
    const active = activeRef;
    if (active === null || active.signature === signature) return;
    invalidate('canceled', 'The photo selection changed while it was being sent.');
  });

  $effect(() => {
    const options = getOptions();
    const connection = options.connection;
    const sessionEpoch = options.sessionEpoch;
    const expectedPromptRevision = options.expectedPromptRevision;
    const mediaEnabled = options.mediaEnabled;
    const modelCanViewPhotos = options.modelCanViewPhotos;
    const runtimeAuthority = options.runtimeAuthority;
    const active = activeRef;
    if (active === null) return;
    if (
      connection !== 'live' ||
      sessionEpoch !== active.input.sessionEpoch ||
      expectedPromptRevision !== active.input.expectedPromptRevision ||
      !mediaEnabled ||
      !modelCanViewPhotos ||
      !runtimeAuthority
    ) {
      invalidate('failed-stale', 'The session changed before these photos could be sent.');
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. SUBMIT AND CANCEL HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function submit(streamingBehavior?: 'steer' | 'followUp'): boolean {
    const options = getOptions();
    if (
      activeRef !== null ||
      stateRef.phase === 'delivery-unknown' ||
      draft.state.items.length === 0
    ) {
      return false;
    }
    const signature = draftSignature;
    if (
      !options.mediaEnabled ||
      !draft.canSubmit ||
      !options.modelCanViewPhotos ||
      !options.runtimeAuthority
    ) {
      updateState({
        phase: 'failed-stale',
        submissionId: null,
        progress: {},
        error: draft.blockingMessage ?? 'The current model cannot receive these photos.',
      });
      return false;
    }
    if (options.connection !== 'live') {
      updateState({
        phase: 'waiting-for-connection',
        submissionId: null,
        progress: {},
        error: 'Reconnect before sending these photos.',
      });
      return false;
    }
    if (options.sessionEpoch === null || options.expectedPromptRevision === null) {
      updateState({
        phase: 'failed-stale',
        submissionId: null,
        progress: {},
        error: 'Waiting for a current session snapshot.',
      });
      return false;
    }
    const message = options.prompt.trim();
    if (message.startsWith('/')) {
      updateState({
        phase: 'failed-stale',
        submissionId: null,
        progress: {},
        error: 'Photos cannot be combined with a command.',
      });
      return false;
    }

    const sources: Array<AttachmentSubmissionInputs['sources'][number]> = [];
    for (const item of draft.state.items) {
      const file = draft.getFile(item.id);
      if (file === null) {
        updateState({
          phase: 'failed-retryable',
          submissionId: null,
          progress: {},
          error: 'This photo is no longer available. Choose it again before sending.',
        });
        return false;
      }
      sources.push({ item, file });
    }

    const input: AttachmentSubmissionInputs = {
      sessionId: options.sessionId,
      sessionEpoch: options.sessionEpoch,
      expectedPromptRevision: options.expectedPromptRevision,
      submissionId: createAttachmentSubmissionId(),
      message,
      sources,
      ...(streamingBehavior === undefined ? {} : { streamingBehavior }),
    };
    const active: ActiveSubmission = {
      generation: generationRef + 1,
      controller: new AbortController(),
      signature,
      input,
      reservation: null,
      commitStarted: false,
    };
    generationRef = active.generation;
    activeRef = active;
    updateState({
      phase: 'authorizing',
      submissionId: input.submissionId,
      progress: {},
      error: null,
    });
    void runSubmission(active).catch(() => undefined);
    return true;
  }

  function cancel(): void {
    if (activeRef === null) return;
    invalidate('canceled');
  }

  // ───────────────────────────────────────────────────────────────────
  // 7. PUBLIC CONTROLLER
  // ───────────────────────────────────────────────────────────────────

  return {
    get state() {
      return state;
    },
    get busy() {
      return BUSY_PHASES.has(state.phase);
    },
    submit,
    cancel,
    get retryable() {
      return (
        state.phase === 'failed-retryable' ||
        state.phase === 'failed-stale' ||
        state.phase === 'failed-expired' ||
        state.phase === 'canceled'
      );
    },
    get statusMessage() {
      return submissionStatusMessage(state);
    },
  };

  // ───────────────────────────────────────────────────────────────────
  // 8. SUBMISSION PIPELINE
  // ───────────────────────────────────────────────────────────────────

  async function runSubmission(active: ActiveSubmission): Promise<void> {
    const signal = active.controller.signal;
    try {
      const transfers = await prepareAttachmentTransfers(active.input.sources, signal);
      assertCurrent(active);
      updateState({
        phase: 'authorizing',
        submissionId: active.input.submissionId,
        progress: {},
        error: null,
      });
      active.reservation = await createAttachmentReservation(active.input, transfers, signal);
      assertCurrent(active);
      updateState({
        phase: 'uploading',
        submissionId: active.input.submissionId,
        progress: {},
        error: null,
      });
      await uploadPreparedAttachments(
        active.reservation,
        transfers,
        (update) => {
          if (!isCurrent(active)) return;
          updateState({
            phase: 'uploading',
            submissionId: active.input.submissionId,
            progress: {
              ...stateRef.progress,
              [update.clientId]: Math.max(0, Math.min(1, update.loaded / update.total)),
            },
            error: null,
          });
        },
        signal,
      );
      assertCurrent(active);
      updateState({
        phase: 'server-checking',
        submissionId: active.input.submissionId,
        progress: stateRef.progress,
        error: null,
      });
      const status = await reconcileAttachmentSet(active.reservation, signal);
      assertCurrent(active);
      active.commitStarted = true;
      updateState({
        phase: 'committing',
        submissionId: active.input.submissionId,
        progress: stateRef.progress,
        error: null,
      });
      await commitAttachmentSubmission(active.input, active.reservation, status, signal);
      assertCurrent(active);
      activeRef = null;
      draft.acknowledge();
      updateState({
        phase: 'sent',
        submissionId: active.input.submissionId,
        progress: Object.fromEntries(active.input.sources.map((source) => [source.item.id, 1])),
        error: null,
      });
      getOptions().onSubmitted?.();
    } catch (error: unknown) {
      if (!isCurrent(active)) return;
      const classified = classifyAttachmentError(
        error,
        active.commitStarted ? 'committing' : 'uploading',
      );
      activeRef = null;
      active.controller.abort();
      if (active.commitStarted && classified.code === 'unknown') {
        if (active.reservation !== null) reconcileAmbiguous(active.reservation);
        updateState({
          phase: 'delivery-unknown',
          submissionId: active.input.submissionId,
          progress: {},
          error: classified.message,
        });
        return;
      }
      if (active.reservation !== null) void cancelAttachmentReservation(active.reservation);
      updateState({
        phase: phaseForError(classified.code),
        submissionId: active.input.submissionId,
        progress: {},
        error: classified.message,
      });
    }
  }

  function assertCurrent(active: ActiveSubmission): void {
    if (!isCurrent(active)) throw new AttachmentClientError('canceled');
  }

  function isCurrent(active: ActiveSubmission): boolean {
    return (
      mountedRef &&
      activeRef === active &&
      generationRef === active.generation &&
      !active.controller.signal.aborted
    );
  }
}

// ───────────────────────────────────────────────────────────────────
// 9. MODULE HELPERS
// ───────────────────────────────────────────────────────────────────

function phaseForError(code: AttachmentClientErrorCode): AttachmentSubmissionPhase {
  switch (code) {
    case 'stale':
      return 'failed-stale';
    case 'expired':
      return 'failed-expired';
    case 'canceled':
      return 'canceled';
    default:
      return 'failed-retryable';
  }
}

function submissionStatusMessage(state: AttachmentSubmissionState): string | null {
  switch (state.phase) {
    case 'waiting-for-connection':
      return 'Reconnect before sending photos.';
    case 'authorizing':
      return 'Checking the photo submission.';
    case 'uploading':
      return 'Sending photos securely.';
    case 'server-checking':
      return 'Checking that every photo is ready.';
    case 'committing':
      return 'Sending the message and photos.';
    case 'sent':
      return state.submissionId === null ? null : 'Photos sent.';
    case 'delivery-unknown':
      return 'Delivery could not be confirmed. Send is blocked until you choose what to do.';
    default:
      return state.error;
  }
}
