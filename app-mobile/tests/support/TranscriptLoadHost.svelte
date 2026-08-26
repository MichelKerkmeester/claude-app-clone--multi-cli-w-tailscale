<script lang="ts">
  import { untrack } from 'svelte';

  import TranscriptList from '../../src/pages/chat/transcript/transcript-list.svelte';
  import TranscriptLoadPanel from '../../src/pages/chat/transcript/transcript-load-panel.svelte';
  import {
    deriveTranscriptLoadState,
    nextHeldTranscriptBlocks,
  } from '../../src/pages/chat/transcript/transcript-load-state.js';
  import type {
    ConnectionPhase,
    DisplayTranscriptBlock,
    TranscriptState,
  } from '../../src/shared/state/state.js';

  let {
    transcript,
    connection,
  }: {
    transcript: TranscriptState;
    connection: ConnectionPhase;
  } = $props();

  let heldBlocks = $state<readonly DisplayTranscriptBlock[] | null>(null);

  $effect(() => {
    const current = transcript;
    untrack(() => {
      heldBlocks = nextHeldTranscriptBlocks(current, heldBlocks);
    });
  });

  const view = $derived(deriveTranscriptLoadState({ transcript, connection, heldBlocks }));
</script>

{#if view.showThread}
  <TranscriptList sessionId="session_load_001" blocks={view.blocks} running={false} />
{:else}
  <TranscriptLoadPanel {view} {...(view.retryable ? { onRetry: () => undefined } : {})} />
{/if}
