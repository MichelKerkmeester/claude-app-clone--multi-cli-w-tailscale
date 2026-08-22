<script lang="ts">
  // Renders just the provider + an ApiCapture child (no cards, no trigger),
  // mirroring the React oracle's test 11 harness: <ArtifactViewerProvider><ApiCapture/>
  // so tests can drive api.openDiff(...) directly with trigger=null and no
  // transcript scroll in the DOM.
  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';
  import ArtifactViewerApiCapture from './ArtifactViewerApiCapture.svelte';
  import type { ArtifactViewerContextValue } from '../../src/pages/chat/artifacts/types.js';

  let { onReady }: { onReady: (api: ArtifactViewerContextValue) => void } = $props();
</script>

<ArtifactViewerProvider>
  <ArtifactViewerApiCapture {onReady} />
</ArtifactViewerProvider>
