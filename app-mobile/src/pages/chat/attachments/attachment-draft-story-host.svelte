<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ATTACHMENT DRAFT STORY HOST
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  // This surface: AttachmentDraftStoryHost — story-support scaffolding for the
  // Context-only attachment components (rail, preview dialog) read everything through getAttachmentDraft().
  // This host supplies real staged files so those surfaces render without fabricated application data.
  import { onMount, type Snippet } from 'svelte';
  import { getAttachmentDraft } from './attachment-draft-provider.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    readonly children: Snippet;
    readonly openPreview?: boolean;
  }

  let { children, openPreview = false }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const draft = getAttachmentDraft();

  const TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  onMount(() => {
    draft.selectFiles([transparentPixelFile('photo-1.png'), transparentPixelFile('photo-2.png')]);
    if (!openPreview) return;
    const first = draft.state.items[0];
    if (first) draft.openPreview(first.id);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep transparent pixel file focused on its single responsibility.
  function transparentPixelFile(name: string): File {
    const binary = atob(TRANSPARENT_PIXEL.slice(TRANSPARENT_PIXEL.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: 'image/png' });
  }
</script>

<!-- Component content -->
{@render children()}
