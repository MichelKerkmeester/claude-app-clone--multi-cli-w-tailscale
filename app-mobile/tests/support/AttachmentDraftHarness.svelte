<script module lang="ts">
  export interface AttachmentDraftHarnessProps {
    readonly mode?: 'rail' | 'preview';
    readonly fileType?: string;
  }
</script>

<script lang="ts">
  import { getAttachmentDraft } from '../../src/pages/chat/attachments/attachment-draft-provider.svelte';
  import AttachmentRail from '../../src/pages/chat/attachments/attachment-rail.svelte';
  import AttachmentPreviewDialog from '../../src/pages/chat/attachments/dialog-attachment-preview.svelte';

  let { mode = 'rail', fileType = 'image/jpeg' }: AttachmentDraftHarnessProps = $props();

  const draft = getAttachmentDraft();

  function photo(name: string): File {
    return new File(['image'], name, { type: 'image/png' });
  }

  function selectRailFixtures(): void {
    draft.selectFiles([photo('first.png'), photo('private-camera-name.png'), photo('third.png')]);
  }

  function selectPreviewFixture(): void {
    const file = new File(
      ['image'],
      fileType === 'image/heic' ? 'camera.heic' : 'camera.jpg',
      { type: fileType },
    );
    draft.selectFiles([file]);
  }
</script>

{#if mode === 'rail'}
  <button type="button" onclick={selectRailFixtures}>select rail fixtures</button>
  <AttachmentRail />
{:else}
  <button type="button" onclick={selectPreviewFixture}>select preview fixture</button>
  <button type="button" data-attachment-plus aria-label="Add photo">+</button>
  <AttachmentRail />
  <AttachmentPreviewDialog />
{/if}
