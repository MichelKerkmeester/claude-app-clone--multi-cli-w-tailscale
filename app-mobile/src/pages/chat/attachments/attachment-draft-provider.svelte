<script module lang="ts">
  // This module holds the shared Attachment Draft Provider types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep get attachment draft focused on its single responsibility.
  export function getAttachmentDraft(): AttachmentDraftContextValue {
    return getContext<AttachmentDraftContextValue | null>(ATTACHMENT_DRAFT_KEY) ?? EMPTY_CONTEXT;
  }

  // Keep is accepted image focused on its single responsibility.
  function isAcceptedImage(type: string): boolean {
    return (MEDIA_SOURCE_MIME_TYPES as readonly string[]).includes(type);
  }

  // Keep is preview unavailable focused on its single responsibility.
  function isPreviewUnavailable(type: string): boolean {
    return type === 'image/heic' || type === 'image/heif';
  }
</script>

<script lang="ts">
  // This surface: AttachmentDraftProvider — context provider for the chat attachment draft (selection, previews, capability gating).
  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    children,
    sessionId = null,
    capability = null,
    modelCanViewPhotos = true,
  }: AttachmentDraftProviderProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const mediaAvailable = $derived(capabilityAllowsPhotos(capability));

  // ───────────────────────────────────────────────────────────────────
  // 7. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (previousSession !== sessionId) {
      previousSession = sessionId;
      // untrack(clearStoredDraft) — depend on sessionId only, not draftState this effect writes.
      untrack(() => clearStoredDraft());
    }
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const modelChanged = previousModelCanViewPhotos !== modelCanViewPhotos;
    previousModelCanViewPhotos = modelCanViewPhotos;
    // untrack mutations — dispatch reduces draftState; tracking them re-runs and crashes Session view.
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

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const onLogout = () => clearStoredDraft();
    const onAppLock = () => clearStoredDraft();
    const onPageHide = () => clearStoredDraft();
    // Keep on visibility change focused on its single responsibility.
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

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep dispatch focused on its single responsibility.
  function dispatch(action: AttachmentDraftAction): void {
    draftState = attachmentDraftReducer(draftState, action);
  }

  // Keep revoke object url focused on its single responsibility.
  function revokeObjectUrl(id: string): void {
    const entry = stored.get(id);
    if (entry === undefined) return;
    if (entry.objectUrl !== null && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(entry.objectUrl);
    }
    stored.delete(id);
  }

  // Keep revoke all object urls focused on its single responsibility.
  function revokeAllObjectUrls(): void {
    for (const id of stored.keys()) revokeObjectUrl(id);
  }

  // Keep clear stored draft focused on its single responsibility.
  function clearStoredDraft(): void {
    revokeAllObjectUrls();
    dispatch({ type: 'lifecycle-clear' });
  }

  // Keep clear for capability loss focused on its single responsibility.
  function clearForCapabilityLoss(message: string | null, phase: 'idle' | 'model-blocked'): void {
    revokeAllObjectUrls();
    dispatch({ type: 'lifecycle-clear', message, phase });
  }

  // Keep select files focused on its single responsibility.
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

  // Keep cancel picker focused on its single responsibility.
  function cancelPicker(): void {
    dispatch({ type: 'picker-cancel' });
  }

  // Keep remove attachment focused on its single responsibility.
  function removeAttachment(id: string): void {
    revokeObjectUrl(id);
    dispatch({ type: 'remove', id });
  }

  // Keep clear draft focused on its single responsibility.
  function clearDraft(): void {
    clearStoredDraft();
  }
  // Keep acknowledge focused on its single responsibility.
  function acknowledge(): void {
    clearStoredDraft();
  }
  // Keep logout focused on its single responsibility.
  function logout(): void {
    clearStoredDraft();
  }
  // Keep app lock focused on its single responsibility.
  function appLock(): void {
    clearStoredDraft();
  }

  // Keep open preview focused on its single responsibility.
  function openPreview(id: string, trigger?: HTMLElement | null): void {
    previewTrigger =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    dispatch({ type: 'preview-open', id });
  }
  // Keep close preview focused on its single responsibility.
  function closePreview(): void {
    dispatch({ type: 'preview-close' });
    const trigger = previewTrigger;
    previewTrigger = null;
    queueMicrotask(() => trigger?.focus({ preventScroll: true }));
  }
  // Keep get file focused on its single responsibility.
  function getFile(id: string): File | null {
    return stored.get(id)?.file ?? null;
  }
  // Keep get object url focused on its single responsibility.
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

<!-- Component content -->
{@render children()}
