import { useEffect } from 'react';
import type { DisplayTranscriptBlock } from '../state.js';
import { useOptionalArtifactViewer } from '../artifacts/ArtifactViewerProvider.js';
import { CodeCard } from './CodeCard.js';
import { CommandOutputCard } from './CommandOutputCard.js';
import { createInMemoryArtifactDocument, type F6RichBlock } from './F6ViewerAdapter.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import {
  type NormalizedActivityBlock,
  type NormalizedCodeBlock,
  type NormalizedCommandBlock,
  type NormalizedDiffBlock,
  type NormalizedFallbackBlock,
  type NormalizedProseBlock,
  type NormalizedTextArtifactBlock,
  type NormalizedTranscriptBlock,
} from './normalizeTranscriptBlocks.js';
import { SafeMarkdown } from './SafeMarkdown.js';
import { TextArtifactCard } from './TextArtifactCard.js';

export interface RichContentRouterProps {
  readonly block: NormalizedTranscriptBlock;
  readonly onOpen?: (block: F6RichBlock, trigger?: HTMLButtonElement | null) => void;
}

export function RichContentRouter({ block, onOpen }: RichContentRouterProps) {
  const viewer = useOptionalArtifactViewer();
  const canOpen = onOpen !== undefined || viewer !== null;
  useEffect(() => {
    if (onOpen !== undefined || viewer === null || !isRichCardBlock(block)) return;
    viewer.updateInMemory(createInMemoryArtifactDocument(block));
  }, [block, onOpen, viewer]);
  const open = (richBlock: F6RichBlock, trigger: HTMLButtonElement | null = null) => {
    if (onOpen !== undefined) {
      onOpen(richBlock, trigger);
      return;
    }
    viewer?.openInMemory(createInMemoryArtifactDocument(richBlock), trigger);
  };

  switch (block.kind) {
    case 'command':
      return (
        <CommandOutputCard
          block={block}
          {...(canOpen ? { onOpen: (trigger) => open(block, trigger ?? null) } : {})}
        />
      );
    case 'code':
      return (
        <CodeCard
          block={block}
          {...(canOpen ? { onOpen: (trigger) => open(block, trigger ?? null) } : {})}
        />
      );
    case 'text-artifact':
      return (
        <TextArtifactCard
          block={block}
          {...(canOpen ? { onOpen: (trigger) => open(block, trigger ?? null) } : {})}
        />
      );
    case 'prose':
      return <ProseBlock block={block} />;
    case 'activity':
      return <ActivityBlock block={block} />;
    case 'diff':
      return <DiffBlock block={block} />;
    case 'fallback':
      return <FallbackBlock block={block} />;
  }
}

// These pure guards are exported for transcript projection and security tests.
// eslint-disable-next-line react-refresh/only-export-components
export function isNormalizedRichContentBlock(value: unknown): value is NormalizedTranscriptBlock {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { readonly kind?: unknown }).kind;
  return (
    kind === 'command' ||
    kind === 'code' ||
    kind === 'text-artifact' ||
    kind === 'prose' ||
    kind === 'activity' ||
    kind === 'diff' ||
    kind === 'fallback'
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function isRichCardBlock(
  block: NormalizedTranscriptBlock,
): block is NormalizedCommandBlock | NormalizedCodeBlock | NormalizedTextArtifactBlock {
  return block.kind === 'command' || block.kind === 'code' || block.kind === 'text-artifact';
}

function ProseBlock({ block }: { readonly block: NormalizedProseBlock }) {
  return (
    <div className={`rich-prose-block block-role-${block.role ?? 'assistant'}`}>
      <SafeMarkdown source={block.canonicalSource} ariaLabel="Transcript response" />
    </div>
  );
}

function ActivityBlock({ block }: { readonly block: NormalizedActivityBlock }) {
  const source = activitySource(block.sourceBlock);
  return (
    <RichBlockFrame
      title={activityTitle(block.sourceBlock)}
      metadata={[block.sourceBlock.kind]}
      className="rich-activity-card"
    >
      <p className="block-copy quiet-copy">{source}</p>
    </RichBlockFrame>
  );
}

function activityTitle(block: DisplayTranscriptBlock): string {
  switch (block.kind) {
    case 'thinking':
      return 'Thinking summary';
    case 'plan':
      return 'Plan / todo';
    case 'tool_call':
      return `Tool call · ${block.toolName}`;
    case 'tool_result':
      return `${block.isError ? 'Tool error' : 'Tool result'} · ${block.toolName}`;
    case 'usage':
      return 'Usage';
    default:
      return 'Activity';
  }
}

function DiffBlock({ block }: { readonly block: NormalizedDiffBlock }) {
  const source = block.sourceBlock as DisplayTranscriptBlock & { readonly patch?: unknown };
  return (
    <RichBlockFrame title="File diff" eyebrow="Diff" className="rich-diff-card">
      <pre className="rich-shell-well">
        {typeof source.patch === 'string' ? source.patch : 'Diff unavailable'}
      </pre>
    </RichBlockFrame>
  );
}

function FallbackBlock({ block }: { readonly block: NormalizedFallbackBlock }) {
  return (
    <RichBlockFrame title="Unsupported block" className="rich-fallback-card">
      <p className="block-copy quiet-copy">
        This redacted “{block.originalKind}” block cannot be displayed by this client.
      </p>
    </RichBlockFrame>
  );
}

function activitySource(block: DisplayTranscriptBlock): string {
  if (block.kind === 'thinking') return block.summary;
  if (block.kind === 'plan') return block.items.map((item) => item.text).join('\n');
  if (block.kind === 'tool_call') return block.inputSummary;
  if (block.kind === 'tool_result') return block.output;
  if (block.kind === 'usage') {
    return `${block.inputTokens} input · ${block.outputTokens} output`;
  }
  return 'Activity is available only as a bounded redacted summary.';
}
