<script lang="ts">
  // Mirrors the React ApiCapture helper: consumes the viewer context from
  // inside the provider and hands the live API to the test via onReady so
  // tests that drive openDiff/openInboundImage/close directly can reach it.
  // The script runs once per instance, so onReady fires a single time on mount.
  import { getArtifactViewer } from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';
  import type { ArtifactViewerContextValue } from '../../src/pages/chat/artifacts/types.js';

  let { onReady }: { onReady: (api: ArtifactViewerContextValue) => void } = $props();

  const viewer = getArtifactViewer();
  onReady(viewer);
</script>
