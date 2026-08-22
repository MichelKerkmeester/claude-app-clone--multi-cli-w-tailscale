<script lang="ts">
  // Renders the provider around a single inbound-image trigger child.
  // Mirrors the React OpenInboundImage + <ArtifactViewerProvider> wrapper.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';
  import InboundImageTriggerChild from './InboundImageTriggerChild.svelte';

  let {
    block,
    label,
  }: { block: InboundImageReadyBlock; label?: string } = $props();
</script>

<ArtifactViewerProvider>
  <InboundImageTriggerChild {block} {label} />
</ArtifactViewerProvider>
