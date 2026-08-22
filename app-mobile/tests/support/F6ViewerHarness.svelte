<script lang="ts">
  // Mirrors the React F6ViewerAdapter oracle harness: the provider wraps a
  // Typed-transcript section with a placeholder Trigger button plus an
  // ApiCapture child that hands the live viewer API to the test via onReady,
  // so the test can drive api.openInMemory / updateInMemory / close directly
  // with trigger=null (no transcript scroll in the DOM).
  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';
  import ArtifactViewerApiCapture from './ArtifactViewerApiCapture.svelte';
  import type { ArtifactViewerContextValue } from '../../src/pages/chat/artifacts/types.js';

  let { onReady }: { onReady: (api: ArtifactViewerContextValue) => void } = $props();
</script>

<ArtifactViewerProvider>
  <section aria-label="Typed transcript" tabindex="-1">
    <button type="button">Trigger</button>
  </section>
  <ArtifactViewerApiCapture {onReady} />
</ArtifactViewerProvider>
