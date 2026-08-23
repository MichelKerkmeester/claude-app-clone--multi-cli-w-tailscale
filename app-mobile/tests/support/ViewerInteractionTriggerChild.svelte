<script lang="ts">
  // Child of ViewerInteractionHarness: rendered inside ArtifactViewerProvider
  // so getArtifactViewer() resolves. Mirrors the React viewer-interaction Harness.
  // When bare is true, the textarea + trigger render without the transcript
  // scroll / Typed-transcript section (React oracle's second and third cases).
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/pages/chat/artifacts/artifact-viewer-provider.svelte';

  let { block, bare = false }: { block: FileDiffBlock; bare?: boolean } = $props();

  const viewer = getArtifactViewer();
</script>

{#if bare}
  <textarea class="composer-input" aria-label="Message Pi"></textarea>
  <button
    type="button"
    onclick={(event) => viewer.openDiff(block, event.currentTarget)}
  >
    Open interaction diff
  </button>
{:else}
  <section aria-label="Typed transcript" tabindex="-1">
    <div class="transcript-scroll">
      <textarea class="composer-input" aria-label="Message Pi"></textarea>
      <button
        type="button"
        onclick={(event) => viewer.openDiff(block, event.currentTarget)}
      >
        Open interaction diff
      </button>
    </div>
  </section>
{/if}
