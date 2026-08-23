<script lang="ts">
  // Child of InboundImageOpenButtonsHarness: rendered inside ArtifactViewerProvider
  // so getArtifactViewer() resolves. Mirrors the React OpenButtons helper.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/pages/chat/artifacts/artifact-viewer-provider.svelte';

  let {
    first,
    second,
  }: {
    first: InboundImageReadyBlock;
    second: InboundImageReadyBlock;
  } = $props();

  const viewer = getArtifactViewer();
</script>

<button
  type="button"
  onclick={(event) => viewer.openInboundImage(first, event.currentTarget, null)}
>
  Open first
</button>
<button
  type="button"
  onclick={(event) => viewer.openInboundImage(second, event.currentTarget, null)}
>
  Open second
</button>
