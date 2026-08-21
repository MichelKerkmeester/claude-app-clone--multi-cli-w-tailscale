<script module lang="ts">
  import type { NormalizedTranscriptBlock } from '../../rich-content/normalizeTranscriptBlocks.js';

  export interface NormalizedTranscriptBlockViewProps {
    readonly block: NormalizedTranscriptBlock;
    readonly sessionId: string;
    readonly canAnswer: boolean;
    readonly askQuestionPrincipal?: string | undefined;
  }
</script>

<script lang="ts">
  import Block from './Block.svelte';
  import RichContentRouter from '../rich-content/RichContentRouter.svelte';

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
