<script module lang="ts">
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  export interface AttachmentSubmissionSurfaceProps {
    readonly capability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly modelCanViewPhotos?: boolean;
    readonly expectedPromptRevision?: number;
    readonly connection?: string;
    readonly file: File;
  }
</script>

<script lang="ts">
  import AttachmentDraftProvider from '../../src/pages/chat/attachments/AttachmentDraftProvider.svelte';
  import AttachmentSubmissionHarness from './AttachmentSubmissionHarness.svelte';

  let {
    capability = { enabled: true, imageIn: true },
    modelCanViewPhotos = true,
    expectedPromptRevision = 1,
    connection = 'live',
    file,
  }: AttachmentSubmissionSurfaceProps = $props();
</script>

<AttachmentDraftProvider {capability} {modelCanViewPhotos}>
  <AttachmentSubmissionHarness
    {expectedPromptRevision}
    {modelCanViewPhotos}
    {connection}
    {file}
  />
</AttachmentDraftProvider>
