// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Draft Provider
// ───────────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  MEDIA_SOURCE_MIME_TYPES,
  type RuntimeMediaCapabilityDto,
} from '@pi-remote/pi-rpc-protocol';

import {
  attachmentDraftReducer,
  capabilityAllowsPhotos,
  EMPTY_ATTACHMENT_DRAFT,
  MAX_ATTACHMENT_COUNT,
  modelBlockedMessage,
  type AttachmentDraftState,
} from './attachment-state.js';

interface StoredAttachment {
  readonly file: File;
  readonly objectUrl: string | null;
}

export interface AttachmentDraftProviderProps {
  readonly children: ReactNode;
  readonly sessionId?: string | null;
  readonly capability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
  readonly modelCanViewPhotos?: boolean;
}

export interface AttachmentDraftContextValue {
  readonly state: AttachmentDraftState;
  readonly mediaAvailable: boolean;
  readonly hasAttachments: boolean;
  readonly canSubmit: boolean;
  readonly blockingMessage: string | null;
  readonly selectFiles: (files: FileList | readonly File[] | null) => void;
  readonly cancelPicker: () => void;
  readonly removeAttachment: (id: string) => void;
  readonly clearDraft: () => void;
  readonly acknowledge: () => void;
  readonly logout: () => void;
  readonly appLock: () => void;
  readonly openPreview: (id: string, trigger?: HTMLElement | null) => void;
  readonly closePreview: () => void;
  readonly getObjectUrl: (id: string) => string | null;
}

const EMPTY_CONTEXT: AttachmentDraftContextValue = {
  state: EMPTY_ATTACHMENT_DRAFT,
  mediaAvailable: false,
  hasAttachments: false,
  canSubmit: true,
  blockingMessage: null,
  selectFiles: () => undefined,
  cancelPicker: () => undefined,
  removeAttachment: () => undefined,
  clearDraft: () => undefined,
  acknowledge: () => undefined,
  logout: () => undefined,
  appLock: () => undefined,
  openPreview: () => undefined,
  closePreview: () => undefined,
  getObjectUrl: () => null,
};

const AttachmentDraftContext = createContext<AttachmentDraftContextValue | null>(null);

export function AttachmentDraftProvider({
  children,
  sessionId = null,
  capability = null,
  modelCanViewPhotos = true,
}: AttachmentDraftProviderProps) {
  const mediaAvailable = capabilityAllowsPhotos(capability);
  const initialState = useRef<AttachmentDraftState | null>(null);
  if (initialState.current === null) {
    initialState.current = {
      ...EMPTY_ATTACHMENT_DRAFT,
      capabilityAvailable: mediaAvailable,
      modelCanViewPhotos,
    };
  }
  const [state, dispatch] = useReducer(attachmentDraftReducer, initialState.current);
  const stateRef = useRef(state);
  const previousSessionRef = useRef(sessionId);
  const previousModelCanViewPhotosRef = useRef(modelCanViewPhotos);
  const nextIdRef = useRef(1);
  const storedRef = useRef(new Map<string, StoredAttachment>());
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  stateRef.current = state;

  const revokeObjectUrl = useCallback((id: string) => {
    const stored = storedRef.current.get(id);
    if (stored === undefined) return;
    if (stored.objectUrl !== null && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(stored.objectUrl);
    }
    storedRef.current.delete(id);
  }, []);

  const revokeAllObjectUrls = useCallback(() => {
    for (const id of storedRef.current.keys()) revokeObjectUrl(id);
  }, [revokeObjectUrl]);

  const clearStoredDraft = useCallback(() => {
    revokeAllObjectUrls();
    dispatch({ type: 'lifecycle-clear' });
  }, [revokeAllObjectUrls]);

  const clearForCapabilityLoss = useCallback(
    (message: string | null, phase: 'idle' | 'model-blocked') => {
      revokeAllObjectUrls();
      dispatch({ type: 'lifecycle-clear', message, phase });
    },
    [revokeAllObjectUrls],
  );

  useEffect(() => {
    if (previousSessionRef.current !== sessionId) {
      previousSessionRef.current = sessionId;
      clearStoredDraft();
    }
  }, [clearStoredDraft, sessionId]);

  useEffect(() => {
    const modelChanged = previousModelCanViewPhotosRef.current !== modelCanViewPhotos;
    previousModelCanViewPhotosRef.current = modelCanViewPhotos;

    if (!mediaAvailable) {
      clearForCapabilityLoss(null, 'idle');
      dispatch({ type: 'configure', capabilityAvailable: false, modelCanViewPhotos });
      return;
    }
    if (modelChanged && !modelCanViewPhotos && stateRef.current.items.length > 0) {
      clearForCapabilityLoss(modelBlockedMessage(), 'model-blocked');
    }
    dispatch({ type: 'configure', capabilityAvailable: true, modelCanViewPhotos });
    if (modelChanged && modelCanViewPhotos) dispatch({ type: 'validate' });
  }, [clearForCapabilityLoss, mediaAvailable, modelCanViewPhotos]);

  useEffect(() => {
    const onLogout = () => clearStoredDraft();
    const onAppLock = () => clearStoredDraft();
    const onPageHide = () => clearStoredDraft();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') clearStoredDraft();
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
      revokeAllObjectUrls();
    };
  }, [clearStoredDraft, revokeAllObjectUrls]);

  const selectFiles = useCallback(
    (files: FileList | readonly File[] | null) => {
      if (!mediaAvailable || files === null) {
        dispatch({ type: 'picker-cancel' });
        return;
      }
      dispatch({ type: 'picker-open' });
      const selected = Array.from(files);
      const available = Math.max(0, MAX_ATTACHMENT_COUNT - stateRef.current.items.length);
      const candidates = selected.slice(0, available).map((file) => {
        const id = `attachment-${nextIdRef.current}`;
        nextIdRef.current += 1;
        const accepted = isAcceptedImage(file.type);
        const unavailable = isPreviewUnavailable(file.type);
        let objectUrl: string | null = null;
        if (accepted) {
          if (!unavailable && typeof URL.createObjectURL === 'function') {
            objectUrl = URL.createObjectURL(file);
          }
          storedRef.current.set(id, { file, objectUrl });
        }
        return {
          id,
          accepted,
          preview:
            unavailable || objectUrl === null ? ('unavailable' as const) : ('available' as const),
          reason: accepted ? null : ('unsupported-type' as const),
        };
      });
      dispatch({
        type: 'select',
        candidates,
        limitReached: selected.length > available,
      });
      dispatch({ type: 'validate' });
    },
    [mediaAvailable],
  );

  const cancelPicker = useCallback(() => dispatch({ type: 'picker-cancel' }), []);

  const removeAttachment = useCallback(
    (id: string) => {
      revokeObjectUrl(id);
      dispatch({ type: 'remove', id });
    },
    [revokeObjectUrl],
  );

  const clearDraft = useCallback(() => clearStoredDraft(), [clearStoredDraft]);
  const acknowledge = useCallback(() => clearStoredDraft(), [clearStoredDraft]);
  const logout = useCallback(() => clearStoredDraft(), [clearStoredDraft]);
  const appLock = useCallback(() => clearStoredDraft(), [clearStoredDraft]);

  const openPreview = useCallback((id: string, trigger?: HTMLElement | null) => {
    previewTriggerRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    dispatch({ type: 'preview-open', id });
  }, []);
  const closePreview = useCallback(() => {
    dispatch({ type: 'preview-close' });
    const trigger = previewTriggerRef.current;
    previewTriggerRef.current = null;
    queueMicrotask(() => trigger?.focus({ preventScroll: true }));
  }, []);
  const getObjectUrl = useCallback(
    (id: string) => storedRef.current.get(id)?.objectUrl ?? null,
    [],
  );

  const blockingMessage =
    state.phase === 'model-blocked' || state.items.some((item) => item.status === 'model-blocked')
      ? modelBlockedMessage()
      : state.message;
  const value = useMemo<AttachmentDraftContextValue>(
    () => ({
      state,
      mediaAvailable,
      hasAttachments: state.items.length > 0,
      canSubmit:
        state.items.length === 0 ||
        (state.items.every((item) => item.status === 'local-ready') &&
          state.phase === 'local-ready'),
      blockingMessage,
      selectFiles,
      cancelPicker,
      removeAttachment,
      clearDraft,
      acknowledge,
      logout,
      appLock,
      openPreview,
      closePreview,
      getObjectUrl,
    }),
    [
      acknowledge,
      appLock,
      blockingMessage,
      cancelPicker,
      clearDraft,
      closePreview,
      getObjectUrl,
      logout,
      mediaAvailable,
      openPreview,
      removeAttachment,
      selectFiles,
      state,
    ],
  );

  return (
    <AttachmentDraftContext.Provider value={value}>{children}</AttachmentDraftContext.Provider>
  );
}

export function useAttachmentDraft(): AttachmentDraftContextValue {
  return useContext(AttachmentDraftContext) ?? EMPTY_CONTEXT;
}

function isAcceptedImage(type: string): boolean {
  return (MEDIA_SOURCE_MIME_TYPES as readonly string[]).includes(type);
}

function isPreviewUnavailable(type: string): boolean {
  return type === 'image/heic' || type === 'image/heif';
}
