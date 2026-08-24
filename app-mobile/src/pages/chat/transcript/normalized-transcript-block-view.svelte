<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: NORMALIZED TRANSCRIPT BLOCK VIEW
  // ───────────────────────────────────────────────────────────────────

  import type { NormalizedTranscriptBlock } from '../rich-content/normalize-transcript-blocks.js';

  export interface NormalizedTranscriptBlockViewProps {
    readonly block: NormalizedTranscriptBlock;
    readonly sessionId: string;
    readonly canAnswer: boolean;
    readonly askQuestionPrincipal?: string | undefined;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: NormalizedTranscriptBlockView — renders a normalized transcript block via Block or RichContentRouter.
  import Block from './block.svelte';
  import RichContentRouter from '../rich-content/rich-content-router.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    block,
    sessionId,
    canAnswer,
    askQuestionPrincipal,
  }: NormalizedTranscriptBlockViewProps = $props();
</script>

{#if block.kind === 'fallback' && block.sourceBlock !== null}
  <Block block={block.sourceBlock} {sessionId} {canAnswer} {askQuestionPrincipal} />
{:else if block.kind === 'diff' && block.sourceBlock.kind === 'file_diff'}
  <Block block={block.sourceBlock} {sessionId} {canAnswer} />
{:else}
  <RichContentRouter {block} />
{/if}
