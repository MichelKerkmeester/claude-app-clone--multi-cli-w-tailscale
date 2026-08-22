<script module lang="ts">
  import {
    attachmentStatusLabel,
    type AttachmentDraftItem,
  } from './attachment-state.js';

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
  import { hover, press, focusVisible } from '$shared/primitives/interactions.js';

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
    use:hover
    use:press
    use:focusVisible
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
    use:hover
    use:press
    use:focusVisible
    onclick={() => onRemove(item.id)}
  >
    <span aria-hidden="true">×</span>
  </button>
  <span class="attachment-tile-status" aria-live="polite">{attachmentStatusLabel(item)}</span>
</div>

<!-- @ds surface: attachment-tile — the draft photo tile; preview button, remove control, sr-only status.
     Decomposed into this scoped block; the react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states
     are preserved by the use:hover/use:press/use:focusVisible actions (touch-aware — plain :hover would
     stick after a tap on this mobile surface). Runtime-attr rules use :global([data-*]) so Svelte keeps
     the action-set attribute selectors scoped to this component. Values unchanged. -->
<style>
  .attachment-tile {
    position: relative;
    inline-size: 64px;
    block-size: 64px;
  }

  .attachment-tile-preview {
    position: relative;
    display: grid;
    inline-size: 64px;
    block-size: 64px;
    min-inline-size: 64px;
    min-block-size: 64px;
    place-items: center;
    overflow: hidden;
    padding: 0;
    border: 3px solid var(--canvas);
    border-radius: var(--radius-md);
    outline: 1px solid var(--ink);
    background: var(--surface-muted);
    color: var(--ink);
    cursor: pointer;
  }

  .attachment-tile-preview img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .attachment-tile-preview:global([data-hovered]),
  .attachment-tile-preview:global([data-pressed]) {
    background: var(--accent-soft);
  }

  .attachment-tile-preview:global([data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  .attachment-tile-name {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    padding: 2px 3px;
    overflow: hidden;
    background: color-mix(in srgb, var(--ink) 78%, transparent);
    color: var(--ink-inverse);
    font-size: 0.58rem;
    font-weight: 650;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-tile-unavailable {
    max-inline-size: 100%;
    padding: 3px;
    color: var(--ink-muted);
    font-size: 0.58rem;
    line-height: 1.2;
    text-align: center;
  }

  .attachment-tile-remove {
    position: absolute;
    z-index: 1;
    inset-block-start: -10px;
    inset-inline-end: -14px;
    display: grid;
    inline-size: 44px;
    block-size: 44px;
    min-inline-size: 44px;
    min-block-size: 44px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--control-border);
    border-radius: 999px;
    background: var(--surface-raised);
    color: var(--ink);
    cursor: pointer;
  }

  .attachment-tile-remove span {
    font-size: 1.25rem;
    line-height: 1;
  }

  .attachment-tile-remove:global([data-hovered]),
  .attachment-tile-remove:global([data-pressed]) {
    background: var(--accent-soft);
  }

  .attachment-tile-remove:global([data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  .attachment-tile-status {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-tile-preview,
    .attachment-tile-remove {
      transition: none;
    }
  }
</style>
