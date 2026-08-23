<script lang="ts">
  import { getAttachmentDraft } from './attachment-draft-provider.svelte';
  import AttachmentTile from './attachment-tile.svelte';

  const draft = getAttachmentDraft();
  let pendingRemoval: { readonly index: number } | null = null;

  $effect(() => {
    void draft.state.items;
    const pending = pendingRemoval;
    if (pending === null) return;
    pendingRemoval = null;
    const next = draft.state.items[pending.index] ?? draft.state.items[pending.index - 1] ?? null;
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-attachment-id]'));
    const target =
      next === null ? null : buttons.find((button) => button.dataset.attachmentId === next.id);
    (target ?? document.querySelector<HTMLElement>('[data-attachment-plus]'))?.focus({
      preventScroll: true,
    });
  });
</script>

{#if draft.mediaAvailable && draft.state.items.length > 0}
  <ol class="attachment-rail" aria-label={`Draft photos, ${draft.state.items.length} items`}>
    {#each draft.state.items as item, index (item.id)}
      <li class="attachment-rail-item">
        <AttachmentTile
          {item}
          previewUrl={draft.getObjectUrl(item.id)}
          position={index + 1}
          total={draft.state.items.length}
          onOpen={(id, trigger) => draft.openPreview(id, trigger)}
          onRemove={(id) => {
            pendingRemoval = { index };
            draft.removeAttachment(id);
          }}
        />
      </li>
    {/each}
  </ol>
{/if}

<!-- @ds surface: attachment-rail — the horizontal draft-photo rail; the tiles are child components. -->
<style>
  .attachment-rail {
    display: flex;
    min-inline-size: 0;
    min-block-size: 72px;
    gap: 8px;
    max-inline-size: 100%;
    margin: 0;
    padding-block: 4px;
    padding-inline: 0 2rem;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: thin;
  }

  .attachment-rail-item {
    position: relative;
    flex: 0 0 64px;
    min-inline-size: 64px;
    list-style: none;
  }
</style>
