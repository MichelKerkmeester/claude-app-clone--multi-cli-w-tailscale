<script module lang="ts">
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  export interface ArtifactCardProps {
    readonly block: FileDiffBlock;
  }

  const PEEK_LINE_COUNT = 6;
</script>

<script lang="ts">
  import { getOptionalArtifactViewer } from './ArtifactViewerProvider.svelte';

  let { block }: ArtifactCardProps = $props();

  // @ds surface: artifact-card — the in-transcript read-only card that opens the diff viewer.
  // @ds slot: glyph | body (meta · summary · peek) | open — the card chrome regions.
  // @ds guardrail: do-not-edit — the button + click opening the viewer are frozen.
  let buttonRef = $state<HTMLButtonElement | null>(null);
  const viewer = getOptionalArtifactViewer();
  const patchLines = $derived(block.patch.split('\n'));
  const peekLines = $derived(
    Array.from({ length: PEEK_LINE_COUNT }, (_, index) => patchLines[index] ?? ''),
  );
</script>

<button
  bind:this={buttonRef}
  type="button"
  class="artifact-card"
  aria-label={`Open file diff: ${block.summary}`}
  onclick={() => viewer?.openDiff(block, buttonRef)}
>
  <span class="artifact-card-glyph" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M5 7h14M5 12h14M5 17h8" />
      <path d="M16 15v6M13 18h6" />
    </svg>
  </span>
  <span class="artifact-card-body">
    <span class="artifact-card-meta">
      <span>File diff</span>
      <span>Read-only</span>
    </span>
    <span class="artifact-card-summary">{block.summary}</span>
    <!-- @ds slot: peek — the clipped 6-line diff preview (mayReorder content only). -->
    <span class="artifact-card-peek" aria-label="Diff preview">{#each peekLines as line, index}<span class="artifact-card-peek-line">{line || ' '}{index < peekLines.length - 1 ? '\n' : ''}</span>{/each}</span>
  </span>
  <span class="artifact-card-open" aria-hidden="true">Open</span>
</button>
