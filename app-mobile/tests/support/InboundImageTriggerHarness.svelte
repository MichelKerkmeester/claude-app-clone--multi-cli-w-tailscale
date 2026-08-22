<script lang="ts">
  // Renders the provider around a single inbound-image trigger child.
  // Mirrors the React OpenInboundImage + <ArtifactViewerProvider> wrapper.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';
  import InboundImageTriggerChild from './InboundImageTriggerChild.svelte';

  let { block }: { block: InboundImageReadyBlock } = $props();
</script>

<ArtifactViewerProvider>
  <InboundImageTriggerChild {block} />
</ArtifactViewerProvider>
