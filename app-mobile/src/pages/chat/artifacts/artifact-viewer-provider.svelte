<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ARTIFACT VIEWER PROVIDER
  // ───────────────────────────────────────────────────────────────────

  import { getContext, setContext, type Snippet } from 'svelte';
  import {
    isInboundImageReadyBlock,
    type FileDiffBlock,
    type FilePreviewBlock,
    type InboundImageReadyBlock,
  } from '@pi-remote/pi-rpc-protocol';

  import type {
    ArtifactDismissalReason,
    ArtifactPreview,
    ArtifactViewerContextValue,
    ArtifactViewerPhase,
    ArtifactViewerSource,
    InMemoryArtifactDocument,
  } from './types.js';

  // ───────────────────────────────────────────────────────────────────
  // 1. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const ARTIFACT_VIEWER_KEY = Symbol('pi-remote:artifact-viewer');

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

  export function getArtifactViewer(): ArtifactViewerContextValue {
    const context = getContext<ArtifactViewerContextValue | null>(ARTIFACT_VIEWER_KEY);
    if (context === null || context === undefined) {
      throw new Error('ArtifactCard must be rendered inside ArtifactViewerProvider.');
    }
    return context;
  }

  export function getOptionalArtifactViewer(): ArtifactViewerContextValue | null {
    return getContext<ArtifactViewerContextValue | null>(ARTIFACT_VIEWER_KEY) ?? null;
  }

  function capturePreview(
    block: ArtifactViewerSource,
    trigger: HTMLButtonElement | null,
    generation: number,
    sessionId: string | null,
  ): ArtifactPreview {
    const scrollContainer =
      trigger?.closest<HTMLElement>('.transcript-scroll') ??
      document.querySelector<HTMLElement>('.transcript-scroll');
    const transcriptRegion =
      trigger?.closest<HTMLElement>('[aria-label="Typed transcript"]') ??
      document.querySelector<HTMLElement>('[aria-label="Typed transcript"]');
    const source = Object.freeze(
      isInboundImageReadyBlock(block)
        ? {
            ...block,
            artifact: Object.freeze({
              ...block.artifact,
              full: Object.freeze({ ...block.artifact.full }),
              thumbnail: Object.freeze({ ...block.artifact.thumbnail }),
            }),
            presentation: Object.freeze({ ...block.presentation }),
            redaction: Object.freeze({ ...block.redaction }),
            content: Object.freeze({ ...block.content }),
          }
        : { ...block },
    ) as Readonly<ArtifactViewerSource>;
    return {
      source,
      trigger,
      sessionId,
      scrollContainer,
      scrollTop: scrollContainer?.scrollTop ?? 0,
      scrollLeft: scrollContainer?.scrollLeft ?? 0,
      transcriptRegion,
      generation,
    };
  }

  function restorePreview(
    preview: ArtifactPreview,
    timerRef: { current: number | null },
    restoreFocus = true,
  ): void {
    if (preview.scrollContainer !== null) {
      preview.scrollContainer.scrollTop = preview.scrollTop;
      preview.scrollContainer.scrollLeft = preview.scrollLeft;
    }
    if (!restoreFocus) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (preview.trigger?.isConnected === true) {
        preview.trigger.focus({ preventScroll: true });
        return;
      }
      if (preview.transcriptRegion?.isConnected === true) {
        preview.transcriptRegion.focus({ preventScroll: true });
      }
    }, 0);
  }

  function tagInMemoryHistory(documentId: string): void {
    const state = window.history.state;
    if (state !== null && typeof state === 'object') {
      window.history.replaceState(
        { ...(state as Record<string, unknown>), __piRemoteArtifactBlockId: documentId },
        '',
        window.location.href,
      );
    }
  }

  const PRIVACY_CURTAIN_ID = 'artifact-viewer-privacy-curtain';

  function showPrivacyCurtain(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.artifactViewerPrivacy = 'covered';
    if (document.getElementById(PRIVACY_CURTAIN_ID) !== null) return;
    const curtain = document.createElement('div');
    curtain.id = PRIVACY_CURTAIN_ID;
    curtain.className = 'artifact-viewer-privacy-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.body?.append(curtain);
  }

  function hidePrivacyCurtain(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(PRIVACY_CURTAIN_ID)?.remove();
    delete document.documentElement.dataset.artifactViewerPrivacy;
  }

  function markViewerOpen(open: boolean): void {
    if (typeof document === 'undefined') return;
    if (open) {
      document.documentElement.dataset.artifactViewerOpen = 'true';
      document.querySelector<HTMLElement>('.composer-region textarea, .composer-input')?.blur();
    } else {
      delete document.documentElement.dataset.artifactViewerOpen;
    }
  }

  function purgeViewerPixelNodes(): void {
    if (typeof document === 'undefined') return;
    for (const image of document.querySelectorAll<HTMLImageElement>(
      '.artifact-viewer-dialog img, [data-verified-image="true"]',
    )) {
      image.removeAttribute('src');
      image.removeAttribute('srcset');
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import ArtifactViewerHost from './artifact-viewer-host.svelte';
  import {
    clearArtifactFullResourceStore,
    clearArtifactResourceStore,
  } from './use-artifact-resource.svelte.js';
  import { useArtifactHistory } from './use-artifact-history.svelte.js';

  import './artifact-viewer-provider.css';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { children }: { readonly children: Snippet } = $props();

  // @ds surface: artifact-viewer-provider — the viewer state machine plus privacy lifecycle.
  // @ds guardrail: do-not-edit — The phase machine, dismissal choreography, generation guards, timer bookkeeping, focus/scroll restoration, and privacy-curtain lifecycle are behavioural and NOT designer-editable. Styling belongs in artifact-viewer surface blocks.

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let phase = $state<ArtifactViewerPhase>('closed');
  let preview = $state<ArtifactPreview | null>(null);
  let generationCounter = 0;
  let openingTimer: number | null = null;
  let exitingTimer: number | null = null;
  const restoreTimer: { current: number | null } = { current: null };
  let restoredGeneration: number | null = null;

  const history = useArtifactHistory(() => close('history'));

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function clearTimers(): void {
    if (openingTimer !== null) window.clearTimeout(openingTimer);
    if (exitingTimer !== null) window.clearTimeout(exitingTimer);
    if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    openingTimer = null;
    exitingTimer = null;
    restoreTimer.current = null;
  }

  function openViewer(
    block: ArtifactViewerSource,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
    readyPhase: 'ready-diff' | 'ready-image',
  ): void {
    clearTimers();
    clearArtifactFullResourceStore();
    hidePrivacyCurtain();
    markViewerOpen(true);
    const generation = generationCounter + 1;
    generationCounter = generation;
    const nextPreview = capturePreview(block, trigger, generation, sessionId);
    restoredGeneration = null;
    if (preview === null) history.open();
    preview = nextPreview;
    phase = 'opening';
    openingTimer = window.setTimeout(() => {
      openingTimer = null;
      if (generationCounter !== generation || preview?.generation !== generation) {
        return;
      }
      phase = readyPhase;
    }, 0);
  }

  function openDiff(
    block: FileDiffBlock | FilePreviewBlock | InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
  ): void {
    if (isInboundImageReadyBlock(block)) {
      openInboundImage(block, trigger, trigger?.dataset.artifactSessionId ?? null);
      return;
    }
    openViewer(block, trigger, trigger?.dataset.artifactSessionId ?? null, 'ready-diff');
  }

  function openInboundImage(
    block: InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
  ): void {
    openViewer(
      block,
      trigger,
      sessionId ?? trigger?.dataset.artifactSessionId ?? null,
      'ready-image',
    );
  }

  function openInMemory(document: InMemoryArtifactDocument, trigger: HTMLButtonElement | null): void {
    clearTimers();
    clearArtifactFullResourceStore();
    hidePrivacyCurtain();
    markViewerOpen(true);
    const existing = preview;
    if (existing?.source.kind === 'in-memory' && existing.source.id === document.id) {
      updateInMemory(document);
      return;
    }
    const generation = generationCounter + 1;
    generationCounter = generation;
    const nextPreview = capturePreview(
      document,
      trigger,
      generation,
      trigger?.dataset.artifactSessionId ?? null,
    );
    restoredGeneration = null;
    if (preview === null) history.open();
    tagInMemoryHistory(document.id);
    preview = nextPreview;
    phase = 'opening';
    openingTimer = window.setTimeout(() => {
      openingTimer = null;
      if (generationCounter !== generation || preview?.generation !== generation) {
        return;
      }
      phase = 'ready-diff';
    }, 0);
  }

  function updateInMemory(document: InMemoryArtifactDocument): void {
    const current = preview;
    if (
      current === null ||
      current.source.kind !== 'in-memory' ||
      current.source.id !== document.id
    ) {
      return;
    }
    const currentDocument = current.source;
    const removedSource =
      document.sourceState === 'source-removed' && currentDocument.text.length > 0;
    const nextDocument: InMemoryArtifactDocument = removedSource
      ? {
          ...document,
          text: currentDocument.text,
          summary: 'Source removed · showing the last trustworthy redacted snapshot',
        }
      : document;
    if (
      currentDocument.text === nextDocument.text &&
      currentDocument.summary === nextDocument.summary &&
      currentDocument.revision === nextDocument.revision &&
      currentDocument.sourceState === nextDocument.sourceState &&
      currentDocument.live === nextDocument.live
    ) {
      return;
    }
    const nextPreview: ArtifactPreview = {
      ...current,
      source: Object.freeze({ ...nextDocument }),
    };
    preview = nextPreview;
  }

  // @ds state: exiting · closed · privacy-covered — Closing covers the reader, purges image pixels, clears resources, and bumps generation before exit cleanup. Privacy/security dismissal reasons route through the covered phase.
  // @ds guardrail: do-not-edit — The dismissal state machine and resource teardown are frozen.
  function close(reason: ArtifactDismissalReason = 'close'): void {
    const current = preview;
    if (current === null) {
      purgeViewerPixelNodes();
      clearArtifactResourceStore();
      return;
    }
    clearTimers();
    showPrivacyCurtain();
    purgeViewerPixelNodes();
    clearArtifactResourceStore();
    generationCounter += 1;
    if (reason !== 'history') history.close();
    phase =
      reason === 'privacy-purge' ||
      reason === 'pagehide' ||
      reason === 'logout' ||
      reason === 'session-switch' ||
      reason === 'revoked' ||
      reason === 'transcript-superseded'
        ? 'privacy-covered'
        : 'exiting';
    exitingTimer = window.setTimeout(() => {
      exitingTimer = null;
      if (preview?.generation !== current.generation) return;
      preview = null;
      phase = 'closed';
      markViewerOpen(false);
      hidePrivacyCurtain();
      if (restoredGeneration !== current.generation) {
        restoredGeneration = current.generation;
        restorePreview(current, restoreTimer);
      }
    }, 0);
  }

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => () => {
    clearTimers();
    purgeViewerPixelNodes();
    clearArtifactResourceStore();
    markViewerOpen(false);
    hidePrivacyCurtain();
    history.dispose();
    const current = preview;
    if (current !== null && restoredGeneration !== current.generation) {
      restorePreview(current, restoreTimer, false);
    }
  });

  // @ds guardrail: do-not-edit — Privacy purge on visibility-hide/pagehide/bfcache and event wiring for logout, session-switch, artifact-revoked, and transcript-superseded are security behaviour; they stay frozen and are NOT designer-editable.
  $effect(() => {
    const closeHiddenViewer = () => {
      if (document.visibilityState === 'hidden') {
        close('privacy-purge');
      } else if (preview === null) {
        hidePrivacyCurtain();
      }
    };
    const closeBfcacheViewer = () => {
      close('pagehide');
    };
    const reconcileBfcacheReturn = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (preview !== null) close('pagehide');
      else hidePrivacyCurtain();
    };
    const invalidateViewer = (event: Event) => {
      const reasonByEvent: Record<string, ArtifactDismissalReason> = {
        'pi-remote:privacy-cover': 'privacy-purge',
        'privacy-cover': 'privacy-purge',
        'pi-remote:logout': 'logout',
        logout: 'logout',
        'pi-remote:session-switch': 'session-switch',
        'session-switch': 'session-switch',
        'pi-remote:artifact-revoked': 'revoked',
        'artifact-revoked': 'revoked',
        'pi-remote:app-lock': 'revoked',
        'pi-remote:transcript-superseded': 'transcript-superseded',
        'transcript-superseded': 'transcript-superseded',
      };
      close(reasonByEvent[event.type] ?? 'privacy-purge');
    };
    document.addEventListener('visibilitychange', closeHiddenViewer);
    window.addEventListener('pagehide', closeBfcacheViewer);
    window.addEventListener('pageshow', reconcileBfcacheReturn);
    for (const eventName of [
      'pi-remote:privacy-cover',
      'pi-remote:logout',
      'pi-remote:session-switch',
      'pi-remote:artifact-revoked',
      'pi-remote:app-lock',
      'pi-remote:transcript-superseded',
      'privacy-cover',
      'logout',
      'session-switch',
      'artifact-revoked',
      'transcript-superseded',
    ]) {
      window.addEventListener(eventName, invalidateViewer);
    }
    return () => {
      document.removeEventListener('visibilitychange', closeHiddenViewer);
      window.removeEventListener('pagehide', closeBfcacheViewer);
      window.removeEventListener('pageshow', reconcileBfcacheReturn);
      for (const eventName of [
        'pi-remote:privacy-cover',
        'pi-remote:logout',
        'pi-remote:session-switch',
        'pi-remote:artifact-revoked',
        'pi-remote:app-lock',
        'pi-remote:transcript-superseded',
        'privacy-cover',
        'logout',
        'session-switch',
        'artifact-revoked',
        'transcript-superseded',
      ]) {
        window.removeEventListener(eventName, invalidateViewer);
      }
    };
  });

  const value: ArtifactViewerContextValue = {
    get phase() {
      return phase;
    },
    get preview() {
      return preview;
    },
    openDiff,
    openInboundImage,
    openInMemory,
    updateInMemory,
    close,
  };
  setContext(ARTIFACT_VIEWER_KEY, value);
</script>

{@render children()}
<ArtifactViewerHost {phase} {preview} onClose={close} />
