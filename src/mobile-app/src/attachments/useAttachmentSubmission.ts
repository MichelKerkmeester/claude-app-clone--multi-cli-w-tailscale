// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Attachment Submission State Machine
// ───────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { useAttachmentDraft } from './AttachmentDraftProvider.js';

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

export function useAttachmentSubmission(
  options: UseAttachmentSubmissionOptions,
): AttachmentSubmissionController {
  const draft = useAttachmentDraft();
  const [state, setState] = useState<AttachmentSubmissionState>(IDLE_STATE);
  const stateRef = useRef(state);
  const generationRef = useRef(0);
  const activeRef = useRef<ActiveSubmission | null>(null);
  const mountedRef = useRef(true);
  stateRef.current = state;

  const draftSignature = useMemo(
    () =>
      draft.state.items
        .map((item) => `${item.id}:${item.ordinal}:${item.status}:${item.preview}`)
        .join('|'),
    [draft.state.items],
  );

  const updateState = useCallback((next: AttachmentSubmissionState): void => {
    stateRef.current = next;
    if (mountedRef.current) setState(next);
  }, []);

  const reconcileAmbiguous = useCallback((reservation: AttachmentSubmissionReservation): void => {
    void reconcileAttachmentSet(reservation).catch(() => undefined);
  }, []);

  const invalidate = useCallback(
    (phase: 'canceled' | 'failed-stale', message?: string): void => {
      const active = activeRef.current;
      const effectivePhase = active?.commitStarted === true ? 'delivery-unknown' : phase;
      generationRef.current += 1;
      activeRef.current = null;
      active?.controller.abort();
      if (active?.reservation !== null && active?.reservation !== undefined) {
        if (active.commitStarted) reconcileAmbiguous(active.reservation);
        else void cancelAttachmentReservation(active.reservation);
      }
      updateState({
        phase: effectivePhase,
        submissionId: active?.input.submissionId ?? stateRef.current.submissionId,
        progress: {},
        error:
          message ??
          (effectivePhase === 'delivery-unknown'
            ? 'Delivery could not be confirmed. Do not resend automatically.'
            : phase === 'canceled'
              ? 'Photo sending was canceled.'
              : null),
      });
    },
    [reconcileAmbiguous, updateState],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const active = activeRef.current;
      generationRef.current += 1;
      activeRef.current = null;
      active?.controller.abort();
      if (active?.reservation !== null && active?.reservation !== undefined) {
        if (active.commitStarted) reconcileAmbiguous(active.reservation);
        else void cancelAttachmentReservation(active.reservation);
      }
    };
  }, [reconcileAmbiguous]);

  useEffect(() => {
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
  }, [invalidate]);

  useEffect(() => {
    const active = activeRef.current;
    if (active === null || active.signature === draftSignature) return;
    invalidate('canceled', 'The photo selection changed while it was being sent.');
  }, [draftSignature, invalidate]);

  useEffect(() => {
    const active = activeRef.current;
    if (active === null) return;
    if (
      options.connection !== 'live' ||
      options.sessionEpoch !== active.input.sessionEpoch ||
      options.expectedPromptRevision !== active.input.expectedPromptRevision ||
      !options.mediaEnabled ||
      !options.modelCanViewPhotos ||
      !options.runtimeAuthority
    ) {
      invalidate('failed-stale', 'The session changed before these photos could be sent.');
    }
  }, [
    invalidate,
    options.connection,
    options.expectedPromptRevision,
    options.mediaEnabled,
    options.modelCanViewPhotos,
    options.runtimeAuthority,
    options.sessionEpoch,
  ]);

  const submit = useCallback(
    (streamingBehavior?: 'steer' | 'followUp'): boolean => {
      if (
        activeRef.current !== null ||
        stateRef.current.phase === 'delivery-unknown' ||
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
        generation: generationRef.current + 1,
        controller: new AbortController(),
        signature,
        input,
        reservation: null,
        commitStarted: false,
      };
      generationRef.current = active.generation;
      activeRef.current = active;
      updateState({
        phase: 'authorizing',
        submissionId: input.submissionId,
        progress: {},
        error: null,
      });
      void runSubmission(active).catch(() => undefined);
      return true;
    },
    [draft, draftSignature, options, updateState],
  );

  const cancel = useCallback(() => {
    if (activeRef.current === null) return;
    invalidate('canceled');
  }, [invalidate]);

  const busy = BUSY_PHASES.has(state.phase);
  const retryable =
    state.phase === 'failed-retryable' ||
    state.phase === 'failed-stale' ||
    state.phase === 'failed-expired' ||
    state.phase === 'canceled';
  return {
    state,
    busy,
    submit,
    cancel,
    retryable,
    statusMessage: submissionStatusMessage(state),
  };

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
              ...stateRef.current.progress,
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
        progress: stateRef.current.progress,
        error: null,
      });
      const status = await reconcileAttachmentSet(active.reservation, signal);
      assertCurrent(active);
      active.commitStarted = true;
      updateState({
        phase: 'committing',
        submissionId: active.input.submissionId,
        progress: stateRef.current.progress,
        error: null,
      });
      await commitAttachmentSubmission(active.input, active.reservation, status, signal);
      assertCurrent(active);
      activeRef.current = null;
      draft.acknowledge();
      updateState({
        phase: 'sent',
        submissionId: active.input.submissionId,
        progress: Object.fromEntries(active.input.sources.map((source) => [source.item.id, 1])),
        error: null,
      });
      options.onSubmitted?.();
    } catch (error: unknown) {
      if (!isCurrent(active)) return;
      const classified = classifyAttachmentError(
        error,
        active.commitStarted ? 'committing' : 'uploading',
      );
      activeRef.current = null;
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
      mountedRef.current &&
      activeRef.current === active &&
      generationRef.current === active.generation &&
      !active.controller.signal.aborted
    );
  }
}

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
