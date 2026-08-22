<script module lang="ts">
  import { getContext, setContext, untrack, type Snippet } from 'svelte';
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
    type AttachmentDraftAction,
    type AttachmentDraftState,
  } from './attachment-state.js';

  interface StoredAttachment {
    readonly file: File;
    readonly objectUrl: string | null;
  }

  export interface AttachmentDraftProviderProps {
    readonly children: Snippet;
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
    readonly getFile: (id: string) => File | null;
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
    getFile: () => null,
    getObjectUrl: () => null,
  };

  const ATTACHMENT_DRAFT_KEY = Symbol('pi-remote:attachment-draft');

  export function getAttachmentDraft(): AttachmentDraftContextValue {
    return getContext<AttachmentDraftContextValue | null>(ATTACHMENT_DRAFT_KEY) ?? EMPTY_CONTEXT;
  }

  function isAcceptedImage(type: string): boolean {
    return (MEDIA_SOURCE_MIME_TYPES as readonly string[]).includes(type);
  }

  function isPreviewUnavailable(type: string): boolean {
    return type === 'image/heic' || type === 'image/heif';
  }
</script>

<script lang="ts">
  // @ds surface: AttachmentDraftProvider — context provider for the chat attachment draft (selection, previews, capability gating).
  let {
    children,
    sessionId = null,
    capability = null,
    modelCanViewPhotos = true,
  }: AttachmentDraftProviderProps = $props();

  // ─── Derived state ───────────────────────────────
  const mediaAvailable = $derived(capabilityAllowsPhotos(capability));
  // ─── Local state ───────────────────────────────
  // svelte-ignore state_referenced_locally
  let draftState = $state<AttachmentDraftState>({
    ...EMPTY_ATTACHMENT_DRAFT,
    capabilityAvailable: mediaAvailable,
    modelCanViewPhotos,
  });
  // svelte-ignore state_referenced_locally
  let previousSession: string | null = sessionId;
  // svelte-ignore state_referenced_locally
  let previousModelCanViewPhotos = modelCanViewPhotos;
  let nextId = 1;
  const stored = new Map<string, StoredAttachment>();
  let previewTrigger: HTMLElement | null = null;

  // ─── Handlers ───────────────────────────────
  function dispatch(action: AttachmentDraftAction): void {
    draftState = attachmentDraftReducer(draftState, action);
  }

  function revokeObjectUrl(id: string): void {
    const entry = stored.get(id);
    if (entry === undefined) return;
    if (entry.objectUrl !== null && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(entry.objectUrl);
    }
    stored.delete(id);
  }

  function revokeAllObjectUrls(): void {
    for (const id of stored.keys()) revokeObjectUrl(id);
  }

  function clearStoredDraft(): void {
    revokeAllObjectUrls();
    dispatch({ type: 'lifecycle-clear' });
  }

  function clearForCapabilityLoss(message: string | null, phase: 'idle' | 'model-blocked'): void {
    revokeAllObjectUrls();
    dispatch({ type: 'lifecycle-clear', message, phase });
  }

  // ─── Effects ───────────────────────────────
  $effect(() => {
    if (previousSession !== sessionId) {
      previousSession = sessionId;
      // clearStoredDraft dispatches (reduces draftState); untrack so this effect depends only on
      // sessionId (React's dep) and does not re-trigger on the draftState it just wrote.
      untrack(() => clearStoredDraft());
    }
  });

  $effect(() => {
    const modelChanged = previousModelCanViewPhotos !== modelCanViewPhotos;
    previousModelCanViewPhotos = modelCanViewPhotos;
    // React deps here were [modelCanViewPhotos, mediaAvailable]. Every dispatch() reduces
    // draftState (reads AND writes it), so tracking these calls makes the effect depend on
    // draftState and re-run on its own write → effect_update_depth_exceeded (the Session view
    // crashed). Read the two real deps in tracked scope, then untrack the state mutations.
    const available = mediaAvailable;
    untrack(() => {
      if (!available) {
        clearForCapabilityLoss(null, 'idle');
        dispatch({ type: 'configure', capabilityAvailable: false, modelCanViewPhotos });
        return;
      }
      if (modelChanged && !modelCanViewPhotos && draftState.items.length > 0) {
        clearForCapabilityLoss(modelBlockedMessage(), 'model-blocked');
      }
      dispatch({ type: 'configure', capabilityAvailable: true, modelCanViewPhotos });
      if (modelChanged && modelCanViewPhotos) dispatch({ type: 'validate' });
    });
  });

  $effect(() => {
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
  });

  function selectFiles(files: FileList | readonly File[] | null): void {
    if (!mediaAvailable || files === null) {
      dispatch({ type: 'picker-cancel' });
      return;
    }
    dispatch({ type: 'picker-open' });
    const selected = Array.from(files);
    const available = Math.max(0, MAX_ATTACHMENT_COUNT - draftState.items.length);
    const candidates = selected.slice(0, available).map((file) => {
      const id = `attachment-${nextId}`;
      nextId += 1;
      const accepted = isAcceptedImage(file.type);
      const unavailable = isPreviewUnavailable(file.type);
      let objectUrl: string | null = null;
      if (accepted) {
        if (!unavailable && typeof URL.createObjectURL === 'function') {
          objectUrl = URL.createObjectURL(file);
        }
        stored.set(id, { file, objectUrl });
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
  }

  function cancelPicker(): void {
    dispatch({ type: 'picker-cancel' });
  }

  function removeAttachment(id: string): void {
    revokeObjectUrl(id);
    dispatch({ type: 'remove', id });
  }

  function clearDraft(): void {
    clearStoredDraft();
  }
  function acknowledge(): void {
    clearStoredDraft();
  }
  function logout(): void {
    clearStoredDraft();
  }
  function appLock(): void {
    clearStoredDraft();
  }

  function openPreview(id: string, trigger?: HTMLElement | null): void {
    previewTrigger =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    dispatch({ type: 'preview-open', id });
  }
  function closePreview(): void {
    dispatch({ type: 'preview-close' });
    const trigger = previewTrigger;
    previewTrigger = null;
    queueMicrotask(() => trigger?.focus({ preventScroll: true }));
  }
  function getFile(id: string): File | null {
    return stored.get(id)?.file ?? null;
  }
  function getObjectUrl(id: string): string | null {
    return stored.get(id)?.objectUrl ?? null;
  }

  const value: AttachmentDraftContextValue = {
    get state() {
      return draftState;
    },
    get mediaAvailable() {
      return mediaAvailable;
    },
    get hasAttachments() {
      return draftState.items.length > 0;
    },
    get canSubmit() {
      return (
        draftState.items.length === 0 ||
        (draftState.items.every((item) => item.status === 'local-ready') &&
          draftState.phase === 'local-ready')
      );
    },
    get blockingMessage() {
      return draftState.phase === 'model-blocked' ||
        draftState.items.some((item) => item.status === 'model-blocked')
        ? modelBlockedMessage()
        : draftState.message;
    },
    selectFiles,
    cancelPicker,
    removeAttachment,
    clearDraft,
    acknowledge,
    logout,
    appLock,
    openPreview,
    closePreview,
    getFile,
    getObjectUrl,
  };
  setContext(ATTACHMENT_DRAFT_KEY, value);
</script>

{@render children()}
