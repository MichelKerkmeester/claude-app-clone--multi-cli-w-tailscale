<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ATTACHMENT TILE
  // ───────────────────────────────────────────────────────────────────

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
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';

  import './attachment-tile.css';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { item, previewUrl, onOpen, onRemove, position, total }: AttachmentTileProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let previewFailed = $state(false);
  let previewButtonRef = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const unavailable = $derived(
    item.preview === 'unavailable' || previewUrl === null || previewFailed,
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    void previewUrl;
    void item.preview;
    previewFailed = false;
  });
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
     Decomposed into this co-located CSS file; the react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states
     are preserved by the use:hover/use:press/use:focusVisible actions (touch-aware — plain :hover would
     stick after a tap on this mobile surface). Runtime-attr rules use :global([data-*]) so Svelte keeps
     the action-set attribute selectors scoped to this component. Values unchanged. -->
