<script module lang="ts">
  export interface AttachmentSubmissionHarnessProps {
    readonly expectedPromptRevision?: number;
    readonly modelCanViewPhotos?: boolean;
    readonly connection?: string;
    readonly file: File;
  }
</script>

<script lang="ts">
  import { getAttachmentDraft } from '../../src/pages/chat/attachments/AttachmentDraftProvider.svelte';
  import { useAttachmentSubmission } from '../../src/pages/chat/attachments/useAttachmentSubmission.svelte.js';

  let {
    expectedPromptRevision = 1,
    modelCanViewPhotos = true,
    connection = 'live',
    file,
  }: AttachmentSubmissionHarnessProps = $props();

  const draft = getAttachmentDraft();
  const submission = useAttachmentSubmission(() => ({
    sessionId: 'session_web_fixture',
    sessionEpoch: 'epoch_web_fixture',
    expectedPromptRevision,
    prompt: 'caption',
    connection,
    mediaEnabled: true,
    modelCanViewPhotos,
    runtimeAuthority: true,
  }));
</script>

<button type="button" onclick={() => draft.selectFiles([file])}>select photo</button>
<button type="button" onclick={() => submission.submit()}>Send photos</button>
<button type="button" onclick={submission.cancel}>Cancel photo send</button>
<output data-testid="attachment-count">{draft.state.items.length}</output>
<output data-testid="attachment-phase">{submission.state.phase}</output>
