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
    clearChatDraftCache,
    parkAttachmentSnapshot,
    takeAttachmentSnapshot,
  } from '$shared/state/chat-draft-cache.js';

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

  /** What leaving a session parks, keyed by sessionId, ready for the return visit. */
  interface ParkedAttachmentDraft {
    readonly state: AttachmentDraftState;
    readonly files: readonly { id: string; file: File; objectUrl: string | null }[];
    readonly nextId: number;
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
  let previousModelCanViewPhotos = modelCanViewPhotos;
  let nextId = 1;
  // The session whose park was last consumed; a change means a real switch.
  // The initial capture is deliberate: first mount is not a switch.
  // svelte-ignore state_referenced_locally
  let restoredSession: string | null | undefined = sessionId;
  const stored = new Map<string, StoredAttachment>();
  let previewTrigger: HTMLElement | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Park the staged attachments under the outgoing session and restore
  // whatever the incoming session parked. One cleanup owns both the park
  // and the leftover URL revocation so the park (which keeps object URLs
  // alive in the cache) always runs first. Everything but sessionId
  // happens inside untrack: this effect writes draftState, and depending
  // on it here would re-run the park/restore on every draft keystroke —
  // and writing to state an effect reads is exactly the self-invalidation
  // loop that has bitten this codebase before.
  $effect(() => {
    const sid = sessionId;
    untrack(() => restoreParkedDraft(sid));
    return () => {
      untrack(() => {
        parkCurrentDraft(sid);
        revokeAllObjectUrls();
      });
    };
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
    // Logout and app lock are security events: no session's parked draft
    // may survive them, not just the visible one's.
    const onSecurityClear = () =>
      clearChatDraftCache((snapshot) => {
        // Every parked session's object URLs die with the cache, not just
        // the mounted one's.
        const parked = snapshot as ParkedAttachmentDraft | null;
        if (parked === null) return;
        for (const file of parked.files) {
          if (file.objectUrl !== null) URL.revokeObjectURL(file.objectUrl);
        }
      });
    window.addEventListener('pi-remote:logout', onLogout);
    window.addEventListener('pi-remote:logout', onSecurityClear);
    window.addEventListener('pi-remote:app-lock', onAppLock);
    window.addEventListener('pi-remote:app-lock', onSecurityClear);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pi-remote:logout', onLogout);
      window.removeEventListener('pi-remote:logout', onSecurityClear);
      window.removeEventListener('pi-remote:app-lock', onAppLock);
      window.removeEventListener('pi-remote:app-lock', onSecurityClear);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
    // A cleared draft must not resurrect on the next visit.
    parkAttachmentSnapshot(sessionId, null);
    dispatch({ type: 'lifecycle-clear' });
  }

  // Keep park current draft focused on its single responsibility.
  function parkCurrentDraft(sid: string | null | undefined): void {
    if (sid === null || sid === undefined) {
      revokeAllObjectUrls();
      return;
    }
    if (draftState.items.length === 0) {
      // Nothing staged — a stale park must not outlive the cleared draft.
      parkAttachmentSnapshot(sid, null);
      return;
    }
    const files: { id: string; file: File; objectUrl: string | null }[] = [];
    for (const item of draftState.items) {
      const entry = stored.get(item.id);
      if (entry === undefined) continue;
      files.push({ id: item.id, file: entry.file, objectUrl: entry.objectUrl });
      // Ownership moves to the cache; leftover revocation must not kill
      // the parked object URLs.
      stored.delete(item.id);
    }
    parkAttachmentSnapshot<ParkedAttachmentDraft>(sid, {
      state: { ...draftState, previewId: null },
      files,
      nextId,
    });
  }

  // Keep restore parked draft focused on its single responsibility.
  function restoreParkedDraft(sid: string | null | undefined): void {
    const switched = restoredSession !== sid;
    restoredSession = sid;
    const parked = takeAttachmentSnapshot<ParkedAttachmentDraft>(sid);
    if (parked === null) {
      // Nothing parked. Only a genuine session switch clears: staged work
      // must never bleed between sessions, but a plain remount of the same
      // session (or a draft seeded before mount) keeps what is already there.
      if (switched) {
        revokeAllObjectUrls();
        dispatch({ type: 'lifecycle-clear' });
      }
      return;
    }
    for (const file of parked.files) {
      stored.set(file.id, { file: file.file, objectUrl: file.objectUrl });
    }
    nextId = parked.nextId;
    draftState = parked.state;
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
