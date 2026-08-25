<script lang="ts">
  // Renders the provider around two ArtifactCards inside a transcript scroll,
  // mirroring the React renderViewer() helper. An optional onReady callback
  // receives the live viewer API (via ArtifactViewerApiCapture) so tests that
  // drive openDiff/close directly can reach the context value.
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/artifact-viewer-provider.svelte';
  import ArtifactCard from '../../src/pages/chat/artifacts/card-artifact.svelte';
  import ArtifactViewerApiCapture from './ArtifactViewerApiCapture.svelte';
  import type { ArtifactViewerContextValue } from '../../src/pages/chat/artifacts/types.js';

  let {
    first,
    second,
    onReady,
  }: {
    first: FileDiffBlock;
    second: FileDiffBlock;
    onReady?: (api: ArtifactViewerContextValue) => void;
  } = $props();
</script>

<ArtifactViewerProvider>
  <section aria-label="Typed transcript" tabindex="-1">
    <div class="transcript--scroll" style="height: 300px; overflow: auto;">
      <ArtifactCard block={first} />
      <ArtifactCard block={second} />
    </div>
  </section>
  {#if onReady !== undefined}
    <ArtifactViewerApiCapture {onReady} />
  {/if}
</ArtifactViewerProvider>
