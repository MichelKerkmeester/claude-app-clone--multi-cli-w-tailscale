<script lang="ts">
  // Renders one InboundImageCard per declared inbound-image lifecycle state,
  // mirroring the React oracle's INBOUND_IMAGE_LIFECYCLE_STATES.map(...) corpus
  // so the ported test can scan every [data-image-state] card in one render.
  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import InboundImageCard from '../../src/pages/chat/artifacts/card-inbound-image.svelte';
  import { INBOUND_IMAGE_LIFECYCLE_STATES } from '../../src/pages/chat/artifacts/image-status.svelte';

  let {
    block,
    sessionId,
  }: { block: InboundImageReadyBlock; sessionId: string } = $props();
</script>

<div>
  {#each INBOUND_IMAGE_LIFECYCLE_STATES as state (state)}
    <InboundImageCard {block} {sessionId} state={state} />
  {/each}
</div>
