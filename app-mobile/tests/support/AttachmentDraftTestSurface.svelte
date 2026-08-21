<script module lang="ts">
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  export interface AttachmentDraftTestSurfaceProps {
    readonly capability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly sessionId?: string | null;
    readonly modelCanViewPhotos?: boolean;
    readonly files: readonly File[];
  }
</script>

<script lang="ts">
  import AttachmentDraftProvider from '../../src/lib/attachments/AttachmentDraftProvider.svelte';
  import AttachmentDraftControls from './AttachmentDraftControls.svelte';

  let {
    capability = { enabled: true, imageIn: true },
    sessionId = 'session-one',
    modelCanViewPhotos = true,
    files,
  }: AttachmentDraftTestSurfaceProps = $props();
</script>

<AttachmentDraftProvider {capability} {sessionId} {modelCanViewPhotos}>
  <AttachmentDraftControls {files} />
</AttachmentDraftProvider>
