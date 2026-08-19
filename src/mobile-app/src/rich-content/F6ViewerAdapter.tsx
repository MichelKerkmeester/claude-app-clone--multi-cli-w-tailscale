import { useCallback, type ReactNode } from 'react';

import {
  useArtifactViewer,
  type InMemoryArtifactDocument,
} from '../artifacts/ArtifactViewerProvider.js';
import type {
  NormalizedCodeBlock,
  NormalizedCommandBlock,
  NormalizedTextArtifactBlock,
} from './normalizeTranscriptBlocks.js';

export type F6RichBlock =
  NormalizedCommandBlock | NormalizedCodeBlock | NormalizedTextArtifactBlock;

// The document projection is exported for read-only adapter and security tests.
// eslint-disable-next-line react-refresh/only-export-components
export function createInMemoryArtifactDocument(block: F6RichBlock): InMemoryArtifactDocument {
  if (block.kind === 'command') {
    const command = block.canonicalCommand ?? 'Command unavailable';
    const output = block.canonicalOutput;
    const text = output === null ? `$ ${command}\n` : `$ ${command}\n\n${output}`;
    return {
      kind: 'in-memory',
      id: block.blockId,
      displayName: 'Bash command',
      renderer: 'code',
      text,
      summary: `${lifecycleLabel(block.lifecycle)} · ${block.outputCompleteness === 'complete' ? 'Complete output' : 'Current output'}`,
      language: 'bash',
      redaction: 'applied',
      revision: block.revision,
      live: block.lifecycle === 'running',
      sourceState: block.resultMissing
        ? 'terminal-without-result'
        : block.source === 'cache' && block.lifecycle === 'running'
          ? 'connection-lost'
          : block.source === 'cache'
            ? 'stale-cache'
            : 'current',
    };
  }
  if (block.kind === 'code') {
    return {
      kind: 'in-memory',
      id: block.blockId,
      displayName: `${block.languageLabel} code`,
      renderer: 'code',
      text: block.canonicalSource,
      summary: `${block.languageLabel} · ${block.canonicalSource.split(/\r?\n/u).length} lines`,
      ...(block.language === null ? {} : { language: block.language }),
      redaction: 'applied',
      revision: block.revision,
      sourceState: block.source === 'cache' ? 'stale-cache' : 'current',
    };
  }
  return {
    kind: 'in-memory',
    id: block.blockId,
    displayName: textArtifactLabel(block.label),
    renderer: 'text',
    text: block.canonicalSource,
    summary: `${textArtifactLabel(block.label)} · ${block.canonicalSource.split(/\r?\n/u).length} lines`,
    redaction: 'applied',
    revision: block.revision,
    sourceState: block.source === 'cache' ? 'stale-cache' : 'current',
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useF6ViewerAdapter() {
  const viewer = useArtifactViewer();
  return useCallback(
    (block: F6RichBlock, trigger: HTMLButtonElement | null = null) => {
      viewer.openInMemory(createInMemoryArtifactDocument(block), trigger);
    },
    [viewer],
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReconcileF6Viewer() {
  const viewer = useArtifactViewer();
  return useCallback(
    (block: F6RichBlock) => {
      viewer.updateInMemory(createInMemoryArtifactDocument(block));
    },
    [viewer],
  );
}

export interface F6ViewerAdapterProps {
  readonly block: F6RichBlock;
  readonly children: (open: (trigger?: HTMLButtonElement | null) => void) => ReactNode;
}

export function F6ViewerAdapter({ block, children }: F6ViewerAdapterProps) {
  const open = useF6ViewerAdapter();
  return <>{children((trigger) => open(block, trigger ?? null))}</>;
}

function lifecycleLabel(value: NormalizedCommandBlock['lifecycle']): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function textArtifactLabel(value: NormalizedTextArtifactBlock['label']): string {
  if (value === 'long-text') return 'Long text';
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
