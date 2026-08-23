<script lang="ts">
  // @ds surface: AttachmentDraftStoryHost — story-support scaffolding for the
  // context-only attachment components (rail, preview dialog). Those components
  // declare no props and read everything through getAttachmentDraft(); a bare
  // provider renders nothing because the draft only fills via
  // selectFiles(...), which is reachable from under the provider. This host
  // sits under AttachmentDraftProvider, seeds the draft with two real 1x1
  // transparent-pixel PNG Files on mount (the same bytes the AttachmentTile
  // story uses — UI scaffolding, not fabricated app data), and optionally
  // opens the preview of the first staged photo.
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
