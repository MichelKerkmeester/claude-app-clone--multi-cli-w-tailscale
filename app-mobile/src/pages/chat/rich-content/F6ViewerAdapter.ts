// The in-memory document projection consumed by RichContentRouter and the read-only
// adapter/security tests. Ported from the React rich-content/F6ViewerAdapter.tsx: the
// render-prop component and the useF6ViewerAdapter / useReconcileF6Viewer hooks were dead
// (no importer) and are dropped; RichContentRouter carries the open/reconcile handoff inline.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { InMemoryArtifactDocument } from '../artifacts/types.js';
import type {
  NormalizedCodeBlock,
  NormalizedCommandBlock,
  NormalizedTextArtifactBlock,
} from './normalizeTranscriptBlocks.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type F6RichBlock =
  NormalizedCommandBlock | NormalizedCodeBlock | NormalizedTextArtifactBlock;

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function lifecycleLabel(value: NormalizedCommandBlock['lifecycle']): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function textArtifactLabel(value: NormalizedTextArtifactBlock['label']): string {
  if (value === 'long-text') return 'Long text';
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
