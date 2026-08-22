<script lang="ts">
  // Child of ArtifactPreviewTriggerHarness: rendered inside ArtifactViewerProvider
  // so getArtifactViewer() resolves. Mirrors the React PreviewTrigger helper.
  import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';

  let { block }: { block: FilePreviewBlock } = $props();

  const viewer = getArtifactViewer();
</script>

<button
  type="button"
  data-artifact-session-id="session_artifact_preview"
  onclick={(event) => viewer.openDiff(block, event.currentTarget)}
>
  Open {block.displayName}
</button>
