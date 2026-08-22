// Shared artifact-viewer types, hoisted out of the React ArtifactViewerProvider so the Svelte
// port's Provider / Host / Status chain is acyclic (the React tree relied on type-only imports
// erasing the Provider<->Host<->Status back-edge; per-file Svelte modules make that fragile, so
// the shared types live here). Compile-time only — no runtime behaviour or rendered output changes.

import type {
  FileDiffBlock,
  FilePreviewBlock,
  InboundImageReadyBlock,
} from '@pi-remote/pi-rpc-protocol';

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
