<script module lang="ts">
  export interface AttachmentDraftControlsProps {
    readonly files: readonly File[];
  }
</script>

<script lang="ts">
  import { getAttachmentDraft } from '../../src/pages/chat/attachments/AttachmentDraftProvider.svelte';

  let { files }: AttachmentDraftControlsProps = $props();

  const draft = getAttachmentDraft();

  function removeFirst(): void {
    const first = draft.state.items[0];
    if (first !== undefined) draft.removeAttachment(first.id);
  }
</script>

<button type="button" onclick={() => draft.selectFiles(files)}>select fixtures</button>
<button type="button" onclick={removeFirst}>remove first</button>
<button type="button" onclick={draft.acknowledge}>acknowledge</button>
<output data-testid="state">{JSON.stringify(draft.state)}</output>
<output data-testid="count">{draft.state.items.length}</output>
<output data-testid="message">{draft.blockingMessage ?? ''}</output>
<output data-testid="stored-file">
  {draft.state.items[0] !== undefined && draft.getFile(draft.state.items[0].id) === files[0]
    ? 'same'
    : 'missing'}
</output>
<output data-testid="unknown-file">
  {draft.getFile('attachment-unknown') === null ? 'null' : 'present'}
</output>
