<script lang="ts">
  // Renders the provider around a PreviewTrigger child that opens a
  // FilePreviewBlock through the real viewer context. Mirrors the React
  // PreviewTrigger + <ArtifactViewerProvider> wrapper.
  import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/artifact-viewer-provider.svelte';
  import ArtifactPreviewTriggerChild from './ArtifactPreviewTriggerChild.svelte';

  let { block }: { block: FilePreviewBlock } = $props();
</script>

<ArtifactViewerProvider>
  <ArtifactPreviewTriggerChild {block} />
</ArtifactViewerProvider>
