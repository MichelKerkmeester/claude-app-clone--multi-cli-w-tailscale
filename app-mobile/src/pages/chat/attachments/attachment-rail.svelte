<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ATTACHMENT RAIL
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { getAttachmentDraft } from './attachment-draft-provider.svelte';
  import AttachmentTile from './attachment-tile.svelte';

  import './attachment-rail.css';

  // ───────────────────────────────────────────────────────────────────
  // 2. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const draft = getAttachmentDraft();
  let pendingRemoval: { readonly index: number } | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 3. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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
