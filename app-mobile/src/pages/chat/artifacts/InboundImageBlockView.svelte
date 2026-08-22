<script module lang="ts">
  import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

  export interface InboundImageBlockViewProps {
    readonly block: InboundImageBlock;
    readonly sessionId: string;
  }
</script>

<script lang="ts">
  // @ds surface: InboundImageBlockView — inbound_image transcript block rendered as a card, or an unsupported-capability fallback.
  import { demoInboundImageState, demoInboundMediaCapabilityOff } from '../../../shared/data/demo.js';
  import InboundImageCard from './InboundImageCard.svelte';

  let { block, sessionId }: InboundImageBlockViewProps = $props();
</script>

{#if demoInboundMediaCapabilityOff()}
  <p class="block-copy quiet-copy" data-unsupported-kind="inbound_image">
    A redacted “inbound_image” block cannot be displayed by this client.
  </p>
{:else}
  {@const fixtureState = demoInboundImageState()}
  <InboundImageCard
    {block}
    {sessionId}
    {...(fixtureState === null ? { deferReady: true } : { state: fixtureState })}
  />
{/if}
