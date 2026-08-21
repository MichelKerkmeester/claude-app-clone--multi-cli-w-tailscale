<script module lang="ts">
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  export interface ComposerRecoverySurfaceProps {
    readonly capability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly sessionId: string;
    readonly initialPrompt: string;
  }
</script>

<script lang="ts">
  import AttachmentDraftProvider from '../../src/lib/attachments/AttachmentDraftProvider.svelte';
  import ComposerRecoveryHarness from './ComposerRecoveryHarness.svelte';

  let {
    capability = { enabled: true, imageIn: true },
    sessionId,
    initialPrompt,
  }: ComposerRecoverySurfaceProps = $props();
</script>

<AttachmentDraftProvider {capability} {sessionId}>
  <ComposerRecoveryHarness {sessionId} {initialPrompt} />
</AttachmentDraftProvider>
