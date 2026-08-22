<script module lang="ts">
  const FOCUS_TRAP_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
</script>

<script lang="ts">
  import { useVisualViewportAnchor } from '../../../shared/data/useVisualViewportAnchor.svelte.js';
  import { hideOutside } from '../../../shared/primitives/ariaHideOutside.svelte.js';
  import { hover, press, focusVisible } from '../../../shared/primitives/interactions.js';
  import { getAttachmentDraft } from './AttachmentDraftProvider.svelte';

  const draft = getAttachmentDraft();
  const item = $derived(
    draft.state.items.find((candidate) => candidate.id === draft.state.previewId) ?? null,
  );
  let dialogEl = $state<HTMLElement | null>(null);
  let headingEl = $state<HTMLHeadingElement | null>(null);
  let previewFailed = $state(false);
  let wasOpen = false;

  useVisualViewportAnchor(() => dialogEl);

  $effect(() => {
    if (item === null || dialogEl === null) return;
    return hideOutside([dialogEl]);
  });

  $effect(() => {
    const isOpen = item !== null;
    if (isOpen && !wasOpen) {
      queueMicrotask(() => headingEl?.focus({ preventScroll: true }));
    }
    wasOpen = isOpen;
    if (!isOpen) previewFailed = false;
  });

  const previewUrl = $derived(item === null ? null : draft.getObjectUrl(item.id));
  const unavailable = $derived(
    item !== null && (item.preview === 'unavailable' || previewUrl === null || previewFailed),
  );

  // @ds guardrail: do-not-edit — the removal focus handoff moves focus to the adjacent tile
  // (or the add-photo control) after the previewed item is removed and the dialog closes.
  function remove(): void {
    if (item === null) return;
    const index = draft.state.items.findIndex((candidate) => candidate.id === item.id);
    const nextFocusId = draft.state.items[index + 1]?.id ?? draft.state.items[index - 1]?.id ?? null;
    draft.removeAttachment(item.id);
    draft.closePreview();
    queueMicrotask(() => {
      const target =
        nextFocusId === null
          ? document.querySelector<HTMLElement>('[data-attachment-plus]')
          : Array.from(document.querySelectorAll<HTMLElement>('[data-attachment-id]')).find(
              (button) => button.dataset.attachmentId === nextFocusId,
            );
      (target ?? document.querySelector<HTMLElement>('[data-attachment-plus]'))?.focus({
        preventScroll: true,
      });
    });
  }

  // @ds guardrail: do-not-edit — Escape and underlay press dismiss (react-aria isDismissable);
  // Tab is contained within the dialog.
  function onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      draft.closePreview();
      return;
    }
    if (event.key !== 'Tab') return;
    const root = dialogEl;
    if (root === null) return;
    const focusables = [...root.querySelectorAll<HTMLElement>(FOCUS_TRAP_SELECTOR)].filter(
      (element) => element.getAttribute('aria-hidden') !== 'true',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first === undefined || last === undefined) {
      event.preventDefault();
      root.focus();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === root || root.contains(active) !== true) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || root.contains(active) !== true) {
      event.preventDefault();
      first.focus();
    }
  }

  function onOverlayPointer(event: MouseEvent): void {
    if (event.target === event.currentTarget) draft.closePreview();
  }
</script>

{#if draft.mediaAvailable && item !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="artifact-viewer-overlay attachment-preview-overlay" onclick={onOverlayPointer}>
    <div class="artifact-viewer-modal attachment-preview-modal">
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="artifact-viewer-dialog attachment-preview-dialog"
        role="dialog"
        tabindex="-1"
        aria-label="Photo preview"
        bind:this={dialogEl}
        onkeydown={onDialogKeydown}
      >
        <header class="artifact-viewer-header attachment-preview-header">
          <div class="artifact-viewer-heading-group">
            <span class="artifact-viewer-kicker">Local photo</span>
            <h2 bind:this={headingEl} tabindex="-1" class="artifact-viewer-title">{item.label}</h2>
          </div>
          <button
            type="button"
            class="artifact-viewer-close"
            aria-label="Close preview"
            use:hover
            use:focusVisible
            onclick={() => draft.closePreview()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div class="artifact-viewer-content attachment-preview-content">
          <p class="artifact-viewer-summary">Local-only preview. No copy has been sent.</p>
          <div class="attachment-preview-actions" role="group" aria-label="Photo actions">
            <button
              type="button"
              class="attachment-preview-remove"
              use:hover
              use:press
              use:focusVisible
              onclick={remove}
            >Remove {item.label}</button>
          </div>
          <div class="attachment-preview-canvas">
            {#if unavailable}
              <p class="attachment-preview-unavailable" role="status">Photo · preview unavailable</p>
            {:else}
              <img
                class="attachment-preview-image"
                src={previewUrl}
                alt={`${item.label} preview`}
                onerror={() => {
                  previewFailed = true;
                }}
              />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- @ds surface: attachment-preview-dialog — local-photo preview; reuses the artifact-viewer modal
     chrome (those .artifact-viewer-* rules stay in style.css until that surface is decomposed).
     The react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states on the remove control are
     preserved by the use:hover/use:press/use:focusVisible actions (touch-aware; plain :hover would stick
     after a tap); the reused close control carries use:hover/use:focusVisible for the same reason. The
     scoped remove-control attr rules use :global([data-*]) so Svelte keeps them. Values unchanged. -->
<style>
  .attachment-preview-content {
    align-content: stretch;
  }

  .attachment-preview-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .attachment-preview-remove {
    min-block-size: 44px;
    padding-inline: var(--space-3);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font-weight: 650;
    cursor: pointer;
  }

  .attachment-preview-remove:global([data-hovered]),
  .attachment-preview-remove:global([data-pressed]) {
    background: var(--accent-soft);
  }

  .attachment-preview-remove:global([data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  .attachment-preview-canvas {
    display: grid;
    min-inline-size: 0;
    min-block-size: min(60dvh, 38rem);
    place-items: center;
    overflow: hidden;
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--canvas);
  }

  .attachment-preview-image {
    display: block;
    max-inline-size: 100%;
    max-block-size: min(58dvh, 36rem);
    object-fit: contain;
  }

  .attachment-preview-unavailable {
    max-inline-size: 28ch;
    margin: 0;
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 1.1rem;
    line-height: 1.5;
    text-align: center;
  }

  @media (max-width: 40rem) {
    .attachment-preview-canvas {
      min-block-size: min(52dvh, 28rem);
    }
  }

  @media (max-width: 20rem) {
    .attachment-preview-dialog {
      padding-inline: max(var(--space-3), env(safe-area-inset-left))
        max(var(--space-3), env(safe-area-inset-right));
    }

    .attachment-preview-canvas {
      min-block-size: 12rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-preview-remove,
    .attachment-preview-image {
      transition: none;
    }
  }
</style>
