<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ATTACHMENT DRAFT STORY HOST
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: AttachmentDraftStoryHost — story-support scaffolding for the
  // Context-only attachment components (rail, preview dialog) read everything through getAttachmentDraft().
  // This host supplies real staged files so those surfaces render without fabricated application data.
  import { onMount, type Snippet } from 'svelte';
  import { getAttachmentDraft } from './attachment-draft-provider.svelte';

  interface Props {
    readonly children: Snippet;
    readonly openPreview?: boolean;
  }

  let { children, openPreview = false }: Props = $props();

  const draft = getAttachmentDraft();

  const TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  function transparentPixelFile(name: string): File {
    const binary = atob(TRANSPARENT_PIXEL.slice(TRANSPARENT_PIXEL.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: 'image/png' });
  }

  onMount(() => {
    draft.selectFiles([transparentPixelFile('photo-1.png'), transparentPixelFile('photo-2.png')]);
    if (!openPreview) return;
    const first = draft.state.items[0];
    if (first) draft.openPreview(first.id);
  });
</script>

{@render children()}
