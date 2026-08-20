<script module lang="ts">
  import {
    attachmentStatusLabel,
    type AttachmentDraftItem,
  } from '../../attachments/attachment-state.js';

  export interface AttachmentTileProps {
    readonly item: AttachmentDraftItem;
    readonly previewUrl: string | null;
    readonly onOpen: (id: string, trigger: HTMLElement | null) => void;
    readonly onRemove: (id: string) => void;
    readonly position: number;
    readonly total: number;
  }
</script>

<script lang="ts">
  let { item, previewUrl, onOpen, onRemove, position, total }: AttachmentTileProps = $props();

  let previewFailed = $state(false);
  let previewButtonRef = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    void previewUrl;
    void item.preview;
    previewFailed = false;
  });

  const unavailable = $derived(
    item.preview === 'unavailable' || previewUrl === null || previewFailed,
  );
</script>

<div class="attachment-tile">
  <!-- svelte-ignore a11y_role_supports_aria_props_implicit -->
  <button
    bind:this={previewButtonRef}
    type="button"
    class="attachment-tile-preview"
    data-attachment-id={item.id}
    aria-label={`Preview ${item.label}`}
    aria-posinset={position}
    aria-setsize={total}
    onclick={() => onOpen(item.id, previewButtonRef)}
  >
    {#if unavailable}
      <span class="attachment-tile-unavailable">Photo · preview unavailable</span>
    {:else}
      <img
        src={previewUrl}
        alt={`${item.label} preview`}
        onerror={() => {
          previewFailed = true;
        }}
      />
    {/if}
    <span class="attachment-tile-name">{item.label}</span>
  </button>
  <button
    type="button"
    class="attachment-tile-remove"
    aria-label={`Remove ${item.label}`}
    data-hit-target="44"
    onclick={() => onRemove(item.id)}
  >
    <span aria-hidden="true">×</span>
  </button>
  <span class="attachment-tile-status" aria-live="polite">{attachmentStatusLabel(item)}</span>
</div>
