<script lang="ts">
  // Child of InboundImageTriggerHarness: rendered inside ArtifactViewerProvider
  // so getArtifactViewer() resolves. Mirrors the React OpenInboundImage helper.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';

  let { block }: { block: InboundImageReadyBlock } = $props();

  const viewer = getArtifactViewer();
</script>

<button
  type="button"
  onclick={(event) => viewer.openInboundImage(block, event.currentTarget, null)}
>
  Open screenshot
</button>
