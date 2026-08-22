<script module lang="ts">
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  export interface AttachmentDraftProviderHarnessProps {
    readonly capability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly sessionId?: string | null;
    readonly modelCanViewPhotos?: boolean;
    readonly mode?: 'rail' | 'preview';
    readonly fileType?: string;
  }
</script>

<script lang="ts">
  import AttachmentDraftProvider from '../../src/pages/chat/attachments/AttachmentDraftProvider.svelte';
  import AttachmentDraftHarness from './AttachmentDraftHarness.svelte';

  let {
    capability = { enabled: true, imageIn: true },
    sessionId = null,
    modelCanViewPhotos = true,
    mode = 'rail',
    fileType = 'image/jpeg',
  }: AttachmentDraftProviderHarnessProps = $props();
</script>

<AttachmentDraftProvider {capability} {sessionId} {modelCanViewPhotos}>
  <AttachmentDraftHarness {mode} {fileType} />
</AttachmentDraftProvider>
