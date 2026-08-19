// ───────────────────────────────────────────────────────────────────
// MODULE: Catalog live previews
// ───────────────────────────────────────────────────────────────────
// Best-effort live previews of the real components over deterministic offline
// fixtures. A surface previews here only when its props can be fully satisfied
// from `demo.ts` with correct types and no socket/relay/provider is required;
// every preview is wrapped in its own error boundary so a throw never escapes
// the card. Surfaces that need a live host, a socket, or an auth boundary stay
// registry-only in `registry.ts`.

import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

import { ArtifactCard } from '../../artifacts/ArtifactCard.js';
import { ArtifactStatus } from '../../artifacts/ArtifactStatus.js';
import { CodePreview } from '../../artifacts/CodePreview.js';
import { DiffPreview } from '../../artifacts/DiffPreview.js';
import { TextPreview } from '../../artifacts/TextPreview.js';
import { RichContentRouter } from '../../rich-content/RichContentRouter.js';
import { normalizeTranscriptBlocks } from '../../rich-content/normalizeTranscriptBlocks.js';
import {
  DEMO_DIFF_FIXTURE,
  DEMO_RICH_CONTENT_BLOCKS,
  DEMO_TEXT_CODE_SHARE_BLOCKS,
} from '../../demo.js';
import type { DisplayTranscriptBlock } from '../../state.js';
import { PreviewBoundary } from './PreviewBoundary.js';

/** Deterministic file_diff block built from the offline diffff fixture. */
function demoDiffBlock(): FileDiffBlock {
  return {
    kind: 'file_diff',
    id: 'catalog-diff-001',
    revision: 1,
    seq: 1,
    occurredAt: '1970-01-01T00:00:00.000Z',
    summary: DEMO_DIFF_FIXTURE.summary,
    patch: DEMO_DIFF_FIXTURE.patch,
  };
}

/** Pull the inline text out of the matching text/code share fixture, if any. */
function demoInlineText(renderer: 'text' | 'code'): string {
  const block = DEMO_TEXT_CODE_SHARE_BLOCKS.find((candidate) => candidate.renderer === renderer);
  return block?.content.kind === 'inline-text' ? block.content.text : '';
}

function DiffPreviewPreview() {
  return (
    <>
      <PreviewBoundary title="diff-preview (default)">
        <DiffPreview patch={DEMO_DIFF_FIXTURE.patch} />
      </PreviewBoundary>
      <PreviewBoundary title="diff-preview (wrapped + find)">
        <DiffPreview patch={DEMO_DIFF_FIXTURE.patch} wrap findTerm="expiresAt" />
      </PreviewBoundary>
    </>
  );
}

function ArtifactCardPreview() {
  return (
    <PreviewBoundary title="artifact-card">
      <ArtifactCard block={demoDiffBlock()} />
    </PreviewBoundary>
  );
}

function TextPreviewPreview() {
  return (
    <>
      <PreviewBoundary title="text-preview (ready)">
        <TextPreview text={demoInlineText('text')} />
      </PreviewBoundary>
      <PreviewBoundary title="text-preview (empty)">
        <TextPreview text="" />
      </PreviewBoundary>
      <PreviewBoundary title="text-preview (whitespace)">
        <TextPreview text="   \n  " />
      </PreviewBoundary>
    </>
  );
}

function CodePreviewPreview() {
  // highlight worker is exercised by the rich cards; this standalone preview
  // disables it so the read-only well renders deterministically with no worker.
  return (
    <>
      <PreviewBoundary title="code-preview (default)">
        <CodePreview text={demoInlineText('code')} language="typescript" enableHighlighting={false} />
      </PreviewBoundary>
      <PreviewBoundary title="code-preview (wrapped)">
        <CodePreview text={demoInlineText('code')} language="typescript" enableHighlighting={false} wrap />
      </PreviewBoundary>
    </>
  );
}

function ArtifactStatusPreview() {
  const states = ['ready', 'stalled', 'denied', 'missing', 'too-large'] as const;
  return (
    <PreviewBoundary title="artifact-status">
      <div className="catalog-status-stack">
        {states.map((status) => (
          <ArtifactStatus
            key={status}
            phase="viewer-ready"
            status={status}
            subject="Redacted file diff"
          />
        ))}
      </div>
    </PreviewBoundary>
  );
}

function RichCardsPreview() {
  // Mirror the demo transcript filter: unknown payloads and optimistic drafts
  // never reach the router, matching the live `blocksFor` seam in demo.ts.
  const filtered = DEMO_RICH_CONTENT_BLOCKS.filter(
    (block) => block.kind !== 'unknown_payload' && block.provenance !== 'optimistic',
  );
  const blocks = normalizeTranscriptBlocks(
    filtered as unknown as readonly DisplayTranscriptBlock[],
    DEMO_DIFF_FIXTURE.sessionId,
    'relay',
  );
  return (
    <PreviewBoundary title="rich-content-cards">
      <div className="catalog-rich-stack">
        {blocks.map((block, index) => (
          <RichContentRouter key={index} block={block} />
        ))}
      </div>
    </PreviewBoundary>
  );
}

/** Renders a live preview for a surface id; anything unmatched returns nothing. */
export function LivePreview({ surfaceId }: { readonly surfaceId: string }) {
  switch (surfaceId) {
    case 'diff-preview':
      return <DiffPreviewPreview />;
    case 'artifact-card':
      return <ArtifactCardPreview />;
    case 'text-preview':
      return <TextPreviewPreview />;
    case 'code-preview':
      return <CodePreviewPreview />;
    case 'artifact-status':
      return <ArtifactStatusPreview />;
    case 'rich-content-cards':
      return <RichCardsPreview />;
    default:
      return null;
  }
}

/** A stand-alone fallback card for a registry-only surface shown in preview slots. */
export function RegistryOnlyNote({ reason }: { readonly reason: string }) {
  return (
    <div className="catalog-registry-note" role="note">
      <span className="catalog-registry-note-title">Not previewed live</span>
      <span>{reason}</span>
    </div>
  );
}