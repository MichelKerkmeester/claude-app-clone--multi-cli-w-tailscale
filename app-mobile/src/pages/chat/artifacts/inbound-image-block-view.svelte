<script module lang="ts">
  // This module holds the shared Inbound Image Block View types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: INBOUND IMAGE BLOCK VIEW
  // ───────────────────────────────────────────────────────────────────

  import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

  export interface InboundImageBlockViewProps {
    readonly block: InboundImageBlock;
    readonly sessionId: string;
  }
</script>

<script lang="ts">
  // This surface: InboundImageBlockView — inbound_image transcript block rendered as a card, or an unsupported-capability fallback.
  import { demoInboundImageState, demoInboundMediaCapabilityOff } from '$shared/fixtures/demo.js';
  import InboundImageCard from './card-inbound-image.svelte';

  let { block, sessionId }: InboundImageBlockViewProps = $props();
</script>

<!-- Component content -->
{#if demoInboundMediaCapabilityOff()}
  <p class="block--copy quiet-copy" data-unsupported-kind="inbound_image">
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
