<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { DisplayTranscriptBlock } from '$shared/state/state.js';
  import type {
    NormalizedCodeBlock,
    NormalizedCommandBlock,
    NormalizedTextArtifactBlock,
    NormalizedTranscriptBlock,
  } from './normalize-transcript-blocks.js';
  import type { F6RichBlock } from './f6-viewer-adapter.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface RichContentRouterProps {
    readonly block: NormalizedTranscriptBlock;
    readonly onOpen?: (block: F6RichBlock, trigger?: HTMLButtonElement | null) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // These pure guards are exported for transcript projection and security tests.
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

  export function isRichCardBlock(
    block: NormalizedTranscriptBlock,
  ): block is NormalizedCommandBlock | NormalizedCodeBlock | NormalizedTextArtifactBlock {
    return block.kind === 'command' || block.kind === 'code' || block.kind === 'text-artifact';
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
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { getOptionalArtifactViewer } from '../artifacts/artifact-viewer-provider.svelte';
  import CodeCard from './card-code.svelte';
  import CommandOutputCard from './card-command-output.svelte';
  import { createInMemoryArtifactDocument } from './f6-viewer-adapter.js';
  import RichBlockFrame from './rich-block-frame.svelte';
  import SafeMarkdown from './safe-markdown.svelte';
  import TextArtifactCard from './card-text-artifact.svelte';

  import './rich-content-router.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, onOpen }: RichContentRouterProps = $props();

  // @ds surface: rich-content-router — dispatches each normalized transcript block
  // To its card/view. The block-kind dispatch, the viewer handoff, and the
  // Redaction handling below are guardrailed and not designer-editable.
  // @ds guardrail: do-not-edit — The router's block-kind switch is the single dispatch point; exported type guards keep security boundaries explicit. Not designer-editable.
  const viewer = getOptionalArtifactViewer();

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const canOpen = $derived(onOpen !== undefined || viewer !== null);

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: do-not-edit — The viewer handoff keeps an in-memory document current for hosted blocks; no fetch, endpoint, ticket, download, or host-file read is added.
  $effect(() => {
    if (onOpen !== undefined || viewer === null || !isRichCardBlock(block)) return;
    viewer.updateInMemory(createInMemoryArtifactDocument(block));
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: do-not-edit — The open handoff delegates to bound onOpen or the viewer's openInMemory with the same document; nothing is fetched, written, or read from the host.
  function open(richBlock: F6RichBlock, trigger: HTMLButtonElement | null = null): void {
    if (onOpen !== undefined) {
      onOpen(richBlock, trigger);
      return;
    }
    viewer?.openInMemory(createInMemoryArtifactDocument(richBlock), trigger);
  }
</script>

<!-- @ds guardrail: do-not-edit — Block-kind dispatch renders the matching card; prose, diff, and fallback stay redaction-bounded. -->
{#if block.kind === 'command'}
  <CommandOutputCard
    {block}
    {...(canOpen ? { onOpen: (trigger?: HTMLButtonElement | null) => open(block, trigger ?? null) } : {})}
  />
{:else if block.kind === 'code'}
  <CodeCard
    {block}
    {...(canOpen ? { onOpen: (trigger?: HTMLButtonElement | null) => open(block, trigger ?? null) } : {})}
  />
{:else if block.kind === 'text-artifact'}
  <TextArtifactCard
    {block}
    {...(canOpen ? { onOpen: (trigger?: HTMLButtonElement | null) => open(block, trigger ?? null) } : {})}
  />
{:else if block.kind === 'prose'}
  <div class={`rich-prose-block block-role-${block.role ?? 'assistant'}`}>
    <SafeMarkdown source={block.canonicalSource} ariaLabel="Transcript response" />
  </div>
{:else if block.kind === 'activity'}
  <RichBlockFrame
    title={activityTitle(block.sourceBlock)}
    metadata={[block.sourceBlock.kind]}
    class="rich-activity-card"
  >
    <p class="block-copy quiet-copy">{activitySource(block.sourceBlock)}</p>
  </RichBlockFrame>
{:else if block.kind === 'diff'}
  {@const source = block.sourceBlock as DisplayTranscriptBlock & { readonly patch?: unknown }}
  <RichBlockFrame title="File diff" eyebrow="Diff" class="rich-diff-card">
    <pre class="rich-shell-well">{typeof source.patch === 'string' ? source.patch : 'Diff unavailable'}</pre>
  </RichBlockFrame>
{:else if block.kind === 'fallback'}
  <RichBlockFrame title="Unsupported block" class="rich-fallback-card">
    <p class="block-copy quiet-copy">This redacted “{block.originalKind}” block cannot be displayed by this client.</p>
  </RichBlockFrame>
{/if}

<!-- @ds surface: rich-prose-block — the plain-prose / safe-Markdown read-out block. Decomposed into this co-located CSS file;
     the selectors it was grouped with (safe-markdown*, rich-block-frame, artifact-viewer*)
     stay with their own components. Values unchanged; the bidi-plaintext guardrail is preserved. -->
