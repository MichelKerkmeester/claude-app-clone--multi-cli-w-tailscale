import {
  isInboundImageReadyBlock,
  type FileDiffBlock,
  type FilePreviewBlock,
  type InboundImageReadyBlock,
} from '@pi-remote/pi-rpc-protocol';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { ArtifactViewerHost } from './ArtifactViewerHost.js';
import {
  clearArtifactFullResourceStore,
  clearArtifactResourceStore,
} from './useArtifactResource.js';
import { useArtifactHistory } from './useArtifactHistory.js';

export type ArtifactViewerPhase =
  | 'closed'
  | 'opening'
  | 'full-fetching'
  | 'viewer-ready'
  | 'full-degraded'
  | 'stalled'
  | 'offline-loaded'
  | 'offline-unavailable'
  | 'stale'
  | 'revoked'
  | 'privacy-covered'
  | 'closing'
  | 'aborted'
  | 'ready-diff'
  | 'ready-image'
  | 'exiting';

export type ArtifactDismissalReason =
  | 'close'
  | 'escape'
  | 'history'
  | 'edge-back'
  | 'voiceover-scrub'
  | 'privacy-purge'
  | 'pagehide'
  | 'logout'
  | 'session-switch'
  | 'revoked'
  | 'transcript-superseded';

export interface InMemoryArtifactDocument {
  readonly kind: 'in-memory';
  readonly id: string;
  readonly displayName: string;
  readonly renderer: 'text' | 'code' | 'diff';
  readonly text: string;
  readonly summary: string;
  readonly language?: string;
  readonly redaction: 'applied';
  readonly revision?: string | number;
  readonly live?: boolean;
  readonly sourceState?:
    'current' | 'stale-cache' | 'connection-lost' | 'terminal-without-result' | 'source-removed';
}

export type ArtifactViewerSource =
  FileDiffBlock | FilePreviewBlock | InboundImageReadyBlock | InMemoryArtifactDocument;

export interface ArtifactPreview {
  readonly source: Readonly<ArtifactViewerSource>;
  readonly trigger: HTMLButtonElement | null;
  readonly sessionId: string | null;
  readonly scrollContainer: HTMLElement | null;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly transcriptRegion: HTMLElement | null;
  readonly generation: number;
}

export interface ArtifactViewerContextValue {
  readonly phase: ArtifactViewerPhase;
  readonly preview: ArtifactPreview | null;
  readonly openDiff: (
    block: FileDiffBlock | FilePreviewBlock | InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
  ) => void;
  readonly openInboundImage: (
    block: InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
  ) => void;
  readonly openInMemory: (
    document: InMemoryArtifactDocument,
    trigger: HTMLButtonElement | null,
  ) => void;
  readonly updateInMemory: (document: InMemoryArtifactDocument) => void;
  readonly close: (reason?: ArtifactDismissalReason) => void;
}

const ArtifactViewerContext = createContext<ArtifactViewerContextValue | null>(null);

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

export function ArtifactViewerProvider({ children }: { readonly children: ReactNode }) {
  // @ds surface: artifact-viewer-provider — the viewer state machine plus privacy lifecycle.
  // @ds guardrail: do-not-edit — the phase machine, dismissal choreography, generation guards,
  // timer bookkeeping, focus/scroll restoration, and the privacy-curtain lifecycle below are
  // behavioural and NOT designer-editable. Styling is edited in the artifact-viewer surface blocks.
  const [phase, setPhase] = useState<ArtifactViewerPhase>('closed');
  const [preview, setPreview] = useState<ArtifactPreview | null>(null);
  const generationRef = useRef(0);
  const previewRef = useRef<ArtifactPreview | null>(null);
  const openingTimerRef = useRef<number | null>(null);
  const exitingTimerRef = useRef<number | null>(null);
  const restoreTimerRef = useRef<number | null>(null);
  const restoredGenerationRef = useRef<number | null>(null);
  const closeRef = useRef<(reason?: ArtifactDismissalReason) => void>(() => undefined);
  const history = useArtifactHistory(() => closeRef.current('history'));

  const clearTimers = () => {
    if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    if (exitingTimerRef.current !== null) window.clearTimeout(exitingTimerRef.current);
    if (restoreTimerRef.current !== null) window.clearTimeout(restoreTimerRef.current);
    openingTimerRef.current = null;
    exitingTimerRef.current = null;
    restoreTimerRef.current = null;
  };

  // @ds state: opening · ready-diff · ready-image — the openViewer transition resets timers,
  // purges stale resource stores, clears the privacy curtain, and marks the reader open.
  // @ds guardrail: do-not-edit — generation-guarded open choreography and history.push.
  const openViewer = (
    block: ArtifactViewerSource,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
    readyPhase: 'ready-diff' | 'ready-image',
  ) => {
    clearTimers();
    clearArtifactFullResourceStore();
    hidePrivacyCurtain();
    markViewerOpen(true);
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const nextPreview = capturePreview(block, trigger, generation, sessionId);
    restoredGenerationRef.current = null;
    if (previewRef.current === null) history.open();
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    setPhase('opening');
    openingTimerRef.current = window.setTimeout(() => {
      openingTimerRef.current = null;
      if (generationRef.current !== generation || previewRef.current?.generation !== generation) {
        return;
      }
      setPhase(readyPhase);
    }, 0);
  };

  const openDiff = (
    block: FileDiffBlock | FilePreviewBlock | InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
  ) => {
    if (isInboundImageReadyBlock(block)) {
      openInboundImage(block, trigger, trigger?.dataset.artifactSessionId ?? null);
      return;
    }
    openViewer(block, trigger, trigger?.dataset.artifactSessionId ?? null, 'ready-diff');
  };

  const openInboundImage = (
    block: InboundImageReadyBlock,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
  ) => {
    openViewer(
      block,
      trigger,
      sessionId ?? trigger?.dataset.artifactSessionId ?? null,
      'ready-image',
    );
  };

  const openInMemory = (document: InMemoryArtifactDocument, trigger: HTMLButtonElement | null) => {
    clearTimers();
    clearArtifactFullResourceStore();
    hidePrivacyCurtain();
    markViewerOpen(true);
    const existing = previewRef.current;
    if (existing?.source.kind === 'in-memory' && existing.source.id === document.id) {
      updateInMemory(document);
      return;
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const nextPreview = capturePreview(
      document,
      trigger,
      generation,
      trigger?.dataset.artifactSessionId ?? null,
    );
    restoredGenerationRef.current = null;
    if (previewRef.current === null) history.open();
    tagInMemoryHistory(document.id);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    setPhase('opening');
    openingTimerRef.current = window.setTimeout(() => {
      openingTimerRef.current = null;
      if (generationRef.current !== generation || previewRef.current?.generation !== generation) {
        return;
      }
      setPhase('ready-diff');
    }, 0);
  };

  const updateInMemory = (document: InMemoryArtifactDocument) => {
    const current = previewRef.current;
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
    previewRef.current = nextPreview;
    setPreview(nextPreview);
  };

  // @ds state: exiting · closed · privacy-covered — close(reason) covers the reader with the
  // opaque privacy curtain, purges image pixels, clears the resource store, and bumps the
  // generation before any exit timer; privacy/security dismissal reasons route to covered.
  // @ds guardrail: do-not-edit — the dismissal state machine and resource teardown are frozen.
  const close = (reason: ArtifactDismissalReason = 'close') => {
    const current = previewRef.current;
    if (current === null) {
      purgeViewerPixelNodes();
      clearArtifactResourceStore();
      return;
    }
    clearTimers();
    showPrivacyCurtain();
    purgeViewerPixelNodes();
    clearArtifactResourceStore();
    generationRef.current += 1;
    if (reason !== 'history') history.close();
    setPhase(
      reason === 'privacy-purge' ||
        reason === 'pagehide' ||
        reason === 'logout' ||
        reason === 'session-switch' ||
        reason === 'revoked' ||
        reason === 'transcript-superseded'
        ? 'privacy-covered'
        : 'exiting',
    );
    exitingTimerRef.current = window.setTimeout(() => {
      exitingTimerRef.current = null;
      if (previewRef.current?.generation !== current.generation) return;
      previewRef.current = null;
      setPreview(null);
      setPhase('closed');
      markViewerOpen(false);
      hidePrivacyCurtain();
      if (restoredGenerationRef.current !== current.generation) {
        restoredGenerationRef.current = current.generation;
        restorePreview(current, restoreTimerRef);
      }
    }, 0);
  };
  closeRef.current = close;

  useEffect(
    () => () => {
      clearTimers();
      purgeViewerPixelNodes();
      clearArtifactResourceStore();
      markViewerOpen(false);
      hidePrivacyCurtain();
      history.dispose();
      const current = previewRef.current;
      if (current !== null && restoredGenerationRef.current !== current.generation) {
        restorePreview(current, restoreTimerRef, false);
      }
    },
    [history],
  );

  // @ds guardrail: do-not-edit — privacy purge on visibility-hide/pagehide/bfcache and the
  // event wiring for logout · session-switch · artifact-revoked · transcript-superseded are
  // security behaviour; they stay frozen and are NOT designer-editable.
  useEffect(() => {
    const closeHiddenViewer = () => {
      if (document.visibilityState === 'hidden') {
        closeRef.current('privacy-purge');
      } else if (previewRef.current === null) {
        hidePrivacyCurtain();
      }
    };
    const closeBfcacheViewer = () => {
      closeRef.current('pagehide');
    };
    const reconcileBfcacheReturn = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (previewRef.current !== null) closeRef.current('pagehide');
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
      closeRef.current(reasonByEvent[event.type] ?? 'privacy-purge');
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
  }, []);

  const value: ArtifactViewerContextValue = {
    phase,
    preview,
    openDiff,
    openInboundImage,
    openInMemory,
    updateInMemory,
    close,
  };
  return (
    <ArtifactViewerContext.Provider value={value}>
      {children}
      <ArtifactViewerHost phase={phase} preview={preview} onClose={close} />
    </ArtifactViewerContext.Provider>
  );
}

// These context hooks are exported so viewer seams can share one provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useArtifactViewer(): ArtifactViewerContextValue {
  const context = useContext(ArtifactViewerContext);
  if (context === null)
    throw new Error('ArtifactCard must be rendered inside ArtifactViewerProvider.');
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalArtifactViewer(): ArtifactViewerContextValue | null {
  return useContext(ArtifactViewerContext);
}
