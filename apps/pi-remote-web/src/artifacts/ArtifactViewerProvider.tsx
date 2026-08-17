import type { FileDiffBlock, FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { ArtifactViewerHost } from './ArtifactViewerHost.js';
import { useArtifactHistory } from './useArtifactHistory.js';

export type ArtifactViewerPhase = 'closed' | 'opening' | 'ready-diff' | 'exiting';

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
}

export type ArtifactViewerSource = FileDiffBlock | FilePreviewBlock | InMemoryArtifactDocument;

export interface ArtifactPreview {
  readonly source: Readonly<ArtifactViewerSource>;
  readonly trigger: HTMLButtonElement | null;
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
    block: FileDiffBlock | FilePreviewBlock,
    trigger: HTMLButtonElement | null,
  ) => void;
  readonly openInMemory: (
    document: InMemoryArtifactDocument,
    trigger: HTMLButtonElement | null,
  ) => void;
  readonly close: (reason?: ArtifactDismissalReason) => void;
}

const ArtifactViewerContext = createContext<ArtifactViewerContextValue | null>(null);

function capturePreview(
  block: ArtifactViewerSource,
  trigger: HTMLButtonElement | null,
  generation: number,
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
    scrollContainer,
    scrollTop: scrollContainer?.scrollTop ?? 0,
    scrollLeft: scrollContainer?.scrollLeft ?? 0,
    transcriptRegion,
    generation,
  };
}

function restorePreview(preview: ArtifactPreview): void {
  if (preview.scrollContainer !== null) {
    preview.scrollContainer.scrollTop = preview.scrollTop;
    preview.scrollContainer.scrollLeft = preview.scrollLeft;
  }
  window.setTimeout(() => {
    if (preview.trigger?.isConnected === true) {
      preview.trigger.focus({ preventScroll: true });
      return;
    }
    if (preview.transcriptRegion?.isConnected === true) {
      preview.transcriptRegion.focus({ preventScroll: true });
    }
  }, 0);
}

export function ArtifactViewerProvider({ children }: { readonly children: ReactNode }) {
  const [phase, setPhase] = useState<ArtifactViewerPhase>('closed');
  const [preview, setPreview] = useState<ArtifactPreview | null>(null);
  const generationRef = useRef(0);
  const previewRef = useRef<ArtifactPreview | null>(null);
  const openingTimerRef = useRef<number | null>(null);
  const exitingTimerRef = useRef<number | null>(null);
  const restoredGenerationRef = useRef<number | null>(null);
  const closeRef = useRef<(reason?: ArtifactDismissalReason) => void>(() => undefined);
  const history = useArtifactHistory(() => closeRef.current('history'));

  const clearTimers = () => {
    if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    if (exitingTimerRef.current !== null) window.clearTimeout(exitingTimerRef.current);
    openingTimerRef.current = null;
    exitingTimerRef.current = null;
  };

  const openDiff = (
    block: FileDiffBlock | FilePreviewBlock,
    trigger: HTMLButtonElement | null,
  ) => {
    clearTimers();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const nextPreview = capturePreview(block, trigger, generation);
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
      setPhase('ready-diff');
    }, 0);
  };

  const openInMemory = (
    document: InMemoryArtifactDocument,
    trigger: HTMLButtonElement | null,
  ) => {
    clearTimers();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const nextPreview = capturePreview(document, trigger, generation);
    restoredGenerationRef.current = null;
    if (previewRef.current === null) {
      history.open();
      const state = window.history.state;
      if (state !== null && typeof state === 'object') {
        window.history.replaceState(
          { ...(state as Record<string, unknown>), __piRemoteArtifactBlockId: document.id },
          '',
          window.location.href,
        );
      }
    }
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

  const close = (reason: ArtifactDismissalReason = 'close') => {
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
        restorePreview(current);
      }
    }, 0);
  };
  closeRef.current = close;

  useEffect(
    () => () => {
      clearTimers();
      history.dispose();
      const current = previewRef.current;
      if (current !== null && restoredGenerationRef.current !== current.generation) {
        restorePreview(current);
      }
    },
    [history],
  );

  useEffect(() => {
    const closeHiddenViewer = () => {
      if (document.visibilityState === 'hidden') closeRef.current('close');
    };
    const closeBfcacheViewer = () => closeRef.current('close');
    document.addEventListener('visibilitychange', closeHiddenViewer);
    window.addEventListener('pagehide', closeBfcacheViewer);
    return () => {
      document.removeEventListener('visibilitychange', closeHiddenViewer);
      window.removeEventListener('pagehide', closeBfcacheViewer);
    };
  }, []);

  const value: ArtifactViewerContextValue = { phase, preview, openDiff, openInMemory, close };
  return (
    <ArtifactViewerContext.Provider value={value}>
      {children}
      <ArtifactViewerHost phase={phase} preview={preview} onClose={close} />
    </ArtifactViewerContext.Provider>
  );
}

export function useArtifactViewer(): ArtifactViewerContextValue {
  const context = useContext(ArtifactViewerContext);
  if (context === null)
    throw new Error('ArtifactCard must be rendered inside ArtifactViewerProvider.');
  return context;
}

export function useOptionalArtifactViewer(): ArtifactViewerContextValue | null {
  return useContext(ArtifactViewerContext);
}
