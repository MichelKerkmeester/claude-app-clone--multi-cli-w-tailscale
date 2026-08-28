<script module lang="ts">
  // This module holds the in-app link overlay helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: IN-APP LINK OVERLAY
  // ───────────────────────────────────────────────────────────────────
  // An installed PWA can still be backgrounded if a framed document navigates
  // the top window. This overlay never assigns location or calls window.open,
  // and the frame omits allow-top-navigation so a successful embed cannot
  // replace the chat. Sites that refuse framing stay inside this dialog as a
  // URL read-out rather than leaving the app.
  // The frame is a native tab stop, so it must be part of the trap: leaving it
  // out makes the close button both first and last, the boundary check never
  // fires, and Tab walks straight out of the dialog into the chat behind it.
  const FOCUS_TRAP_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onDestroy } from 'svelte';

  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';
  import { hover, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { useVisualViewportAnchor } from '$shared/viewport/use-visual-viewport-anchor.svelte.js';
  import { classifyHrefScheme } from '../rich-content/prose-link.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    url: string;
    restoreFocusTo?: HTMLElement | null;
    onClose: () => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { url, restoreFocusTo = null, onClose }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 4. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let dialogEl = $state<HTMLElement | null>(null);
  let headingEl = $state<HTMLHeadingElement | null>(null);

  useVisualViewportAnchor(() => dialogEl);

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const allowed = $derived(classifyHrefScheme(url) === 'open-external');
  const framed = $derived(allowed && /^https?:\/\//iu.test(url.trim()));
  const title = $derived(displayTitle(url));

  // ───────────────────────────────────────────────────────────────────
  // 6. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (!allowed || dialogEl === null) return;
    return hideOutside([dialogEl]);
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (!allowed) return;
    const heading = headingEl;
    const timer = window.setTimeout(() => {
      heading?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  });

  onDestroy(() => {
    restoreFocusTo?.focus({ preventScroll: true });
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep display title focused on its single responsibility.
  function displayTitle(value: string): string {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'mailto:') {
        return parsed.pathname.length > 0 ? parsed.pathname : value;
      }
      return parsed.host.length > 0 ? parsed.host : value;
    } catch {
      return value;
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Escape is bound at the document, not just the dialog, so it still closes
  // when focus sits on chrome outside the dialog subtree.
  //
  // It cannot close while focus is INSIDE the framed page: a cross-origin frame
  // never delivers its key events to this document. That is a browser guarantee,
  // not a gap we can close — so the close control stays visible at all times and
  // is the dependable way out of a page that has taken focus.
  $effect(() => {
    // This component only exists while the overlay is open, so mount is the
    // whole lifetime of the listener.
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onDocumentKeydown);
    return () => document.removeEventListener('keydown', onDocumentKeydown);
  });

  // Tab stays inside the dialog so focus cannot scrub back into the transcript.
  function onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
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

  // Keep on overlay pointer focused on its single responsibility.
  function onOverlayPointer(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }
</script>

<!-- Component content -->
<!-- This surface: in-app-link-overlay — a lightweight in-app frame for an already-gated http(s)/mailto URL. -->
{#if allowed}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="artifact-viewer--overlay in-app-link--overlay" onclick={onOverlayPointer}>
    <div class="artifact-viewer--modal in-app-link--modal">
      <div
        class="artifact-viewer--dialog in-app-link--dialog"
        role="dialog"
        tabindex="-1"
        aria-label="In-app link"
        bind:this={dialogEl}
        onkeydown={onDialogKeydown}
      >
        <header class="artifact-viewer--header">
          <div class="artifact-viewer--heading-group">
            <span class="artifact-viewer--eyebrow">Link</span>
            <h2 bind:this={headingEl} tabindex="-1" class="artifact-viewer--title" dir="auto">{title}</h2>
          </div>
          <button
            type="button"
            class="artifact-viewer--close"
            aria-label="Close in-app link"
            use:hover
            use:focusVisible
            onclick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div class="artifact-viewer--content in-app-link--content">
          <p class="in-app-link--url" dir="ltr">{url}</p>
          {#if framed}
            <iframe
              class="in-app-link--frame"
              src={url}
              title={title}
              sandbox="allow-scripts allow-forms"
              referrerpolicy="no-referrer"
            ></iframe>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. LINK OVERLAY
  ─────────────────────────────────────────────────────────────────── */
  /* This slot: in-app-link--content — URL read-out plus optional framed document. */
  .in-app-link--content {
    align-content: stretch;
  }

  /* This slot: in-app-link--url — the gated destination, never a navigable top-level href. */
  .in-app-link--url {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }

  /* This slot: in-app-link--frame — unique-origin embed; top-navigation is not allowed. */
  .in-app-link--frame {
    display: block;
    inline-size: 100%;
    min-block-size: 50dvh;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
</style>
