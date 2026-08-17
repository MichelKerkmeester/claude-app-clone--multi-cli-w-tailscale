import {
  isInboundImageReadyBlock,
  type FileDiffBlock,
  type FilePreviewBlock,
  type InboundImageReadyBlock,
} from '@pi-remote/pi-rpc-protocol';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { ArtifactViewerHost } from './ArtifactViewerHost.js';
import { clearArtifactResourceStore } from './useArtifactResource.js';
import { useArtifactHistory } from './useArtifactHistory.js';

export type ArtifactViewerPhase = 'closed' | 'opening' | 'ready-diff' | 'ready-image' | 'exiting';

export type ArtifactDismissalReason =
  'close' | 'escape' | 'history' | 'edge-back' | 'voiceover-scrub';

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
  const source = Object.freeze({ ...block });
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

export function ArtifactViewerProvider({ children }: { readonly children: ReactNode }) {
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

  const openViewer = (
    block: ArtifactViewerSource,
    trigger: HTMLButtonElement | null,
    sessionId: string | null,
    readyPhase: 'ready-diff' | 'ready-image',
  ) => {
    clearTimers();
    clearArtifactResourceStore();
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
    clearArtifactResourceStore();
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

  const close = (reason: ArtifactDismissalReason = 'close') => {
    clearArtifactResourceStore();
    const current = previewRef.current;
    if (current === null) return;
    clearTimers();
    generationRef.current += 1;
    if (reason !== 'history') history.close();
    setPhase('exiting');
    exitingTimerRef.current = window.setTimeout(() => {
      exitingTimerRef.current = null;
      if (previewRef.current?.generation !== current.generation) return;
      previewRef.current = null;
      setPreview(null);
      setPhase('closed');
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
      clearArtifactResourceStore();
      history.dispose();
      const current = previewRef.current;
      if (current !== null && restoredGenerationRef.current !== current.generation) {
        restorePreview(current, restoreTimerRef, false);
      }
    },
    [history],
  );

  useEffect(() => {
    const closeHiddenViewer = () => {
      if (document.visibilityState === 'hidden') {
        clearArtifactResourceStore();
        closeRef.current('close');
      }
    };
    const closeBfcacheViewer = () => {
      clearArtifactResourceStore();
      closeRef.current('close');
    };
    const invalidateViewer = () => {
      clearArtifactResourceStore();
      closeRef.current('close');
    };
    document.addEventListener('visibilitychange', closeHiddenViewer);
    window.addEventListener('pagehide', closeBfcacheViewer);
    for (const eventName of [
      'pi-remote:privacy-cover',
      'pi-remote:logout',
      'pi-remote:session-switch',
      'pi-remote:artifact-revoked',
    ]) {
      window.addEventListener(eventName, invalidateViewer);
    }
    return () => {
      document.removeEventListener('visibilitychange', closeHiddenViewer);
      window.removeEventListener('pagehide', closeBfcacheViewer);
      for (const eventName of [
        'pi-remote:privacy-cover',
        'pi-remote:logout',
        'pi-remote:session-switch',
        'pi-remote:artifact-revoked',
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
