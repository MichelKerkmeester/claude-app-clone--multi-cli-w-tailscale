<script lang="ts">
  // Renders the provider around two inbound-image trigger buttons nested in a
  // transcript--scroll > Typed-transcript region. Mirrors the React OpenButtons
  // + <ArtifactViewerProvider> wrapper.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/artifact-viewer-provider.svelte';
  import InboundImageOpenButtonsChild from './InboundImageOpenButtonsChild.svelte';

  let {
    first,
    second,
  }: {
    first: InboundImageReadyBlock;
    second: InboundImageReadyBlock;
  } = $props();
</script>

<ArtifactViewerProvider>
  <div class="transcript--scroll">
    <div aria-label="Typed transcript" tabindex="-1">
      <InboundImageOpenButtonsChild {first} {second} />
    </div>
  </div>
</ArtifactViewerProvider>
