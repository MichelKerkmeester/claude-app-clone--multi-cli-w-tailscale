<script module lang="ts">
  // This module holds the shared Quick Prompts Sheet types.
  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface QuickPromptsSheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** The composer updater that keeps selection local until the person sends. */
    readonly setPrompt: (updater: (current: string) => string) => void;
    /** The trigger that opened the sheet; focus returns here on close. */
    triggerRef?: HTMLButtonElement | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 2. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';

  import {
    insertQuickPrompt,
    readQuickPrompts,
    type QuickPrompt,
  } from '$shared/commands/insert-slash-command.js';
  import { press, hover, focused, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetClose from '$shared/primitives/sheet/sheet-close.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 3. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    setPrompt,
    triggerRef = null,
  }: QuickPromptsSheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 4. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let sheetOpen = $state(false);
  let dialogEl = $state<HTMLElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Re-read device-local prompts every time the sheet opens.
  const quickPrompts = $derived.by(() => {
    if (!sheetOpen) return [];
    return readQuickPrompts();
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep the local Sheet binding synchronized without tracking its own write.
  $effect(() => {
    const nextOpen = isOpen;
    untrack(() => {
      sheetOpen = nextOpen;
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Restore focus to the control that opened the sheet after dismissal.
  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  // Close the sheet without touching the composer send path.
  const close = () => {
    onOpenChange(false);
    restoreTriggerFocus();
  };

  // Keep parent state aligned with shared Sheet dismissal semantics.
  function onSheetOpenChange(next: boolean): void {
    if (!next) {
      onOpenChange(false);
      restoreTriggerFocus();
    } else {
      onOpenChange(true);
    }
  }

  // Let the shared Sheet primitive own focus placement.
  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
  }

  // Let the shared Sheet primitive own focus restoration.
  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreTriggerFocus();
  }

  // Insert the selected body as a replaceable draft, then dismiss the sheet.
  function handleSelect(quickPrompt: QuickPrompt): void {
    setPrompt((current) =>
      insertQuickPrompt({
        draft: current,
        selectionStart: 0,
        selectionEnd: current.length,
        quickPrompt,
      }).draft,
    );
    close();
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Attach the same keyboard and pointer affordances as the history rows.
  function attachRowInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const hoverAction = hover(el);
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    const pressAction = press(el);
    return () => {
      if (hoverAction) hoverAction.destroy?.();
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
      if (pressAction) pressAction.destroy?.();
    };
  }

  // Keep a reference for the shared dialog lifecycle.
  function attachDialog(node: Element): () => void {
    const el = node as HTMLElement;
    dialogEl = el;
    return () => {
      if (dialogEl === el) dialogEl = null;
    };
  }
</script>

<!-- Component content -->
<!-- Quick prompts sheet -->
<Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
  <SheetContent
    class="quick-prompts-sheet--overlay"
    id="quick-prompts-dialog"
    aria-labelledby="quick-prompts-title"
    trapFocus={true}
    interactOutsideBehavior="close"
    escapeKeydownBehavior="close"
    onOpenAutoFocus={onOpenAutoFocus}
    onCloseAutoFocus={onCloseAutoFocus}
  >
    <div class="quick-prompts-sheet--modal">
      <div class="quick-prompts-sheet--dialog" {@attach attachDialog}>
        <header class="quick-prompts-sheet--header">
          <SheetTitle id="quick-prompts-title" class="quick-prompts-sheet--title">
            Quick prompts
          </SheetTitle>
          <SheetClose
            class="quick-prompts-sheet--close"
            aria-label="Close quick prompts"
            style="min-block-size: 44px"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </SheetClose>
        </header>

        {#if quickPrompts.length === 0}
          <p class="quick-prompts-sheet--empty">
            No saved quick prompts yet.
          </p>
        {:else}
          <div
            class="quick-prompts-sheet--list"
            role="listbox"
            aria-label="Saved quick prompts"
          >
            {#each quickPrompts as quickPrompt (quickPrompt.label + quickPrompt.prompt)}
              <button
                type="button"
                class="quick-prompts-sheet--row"
                role="option"
                aria-label={quickPrompt.label}
                aria-selected={false}
                onclick={() => handleSelect(quickPrompt)}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(quickPrompt);
                  }
                }}
                style="min-block-size: 44px; text-align: start"
                {@attach attachRowInteractions}
              >
                <span class="quick-prompts-sheet--text">{quickPrompt.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </SheetContent>
</Sheet>

<!-- Quick prompts sheet -->
<style>
  /* Keeps the local prompt library above the current screen without sending data. */
  :global(.quick-prompts-sheet--overlay) {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    max-inline-size: 100vw;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: var(--scrim);
    animation: quick-prompts-backdrop-in 180ms ease-out;
  }

  /* Fades the scrim while the shared Sheet is dismissing. */
  :global(.quick-prompts-sheet--overlay[data-exiting]) {
    animation: quick-prompts-backdrop-out 220ms ease-in;
  }

  /* Keeps the sheet compact while leaving enough room for longer libraries. */
  .quick-prompts-sheet--modal {
    inline-size: min(92vw, 24rem);
    max-inline-size: 100vw;
    max-block-size: calc(var(--visual-viewport-height, 100dvh) * 0.75);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--ink);
    animation: quick-prompts-sheet-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* Mirrors the exit motion used by the prompt history sheet. */
  :global(.quick-prompts-sheet--overlay[data-exiting]) .quick-prompts-sheet--modal {
    animation: quick-prompts-sheet-out 220ms ease-in;
  }

  /* Provides a bounded, safe-area-aware dialog column for the sheet content. */
  .quick-prompts-sheet--dialog {
    display: flex;
    min-inline-size: 0;
    max-block-size: inherit;
    flex-direction: column;
    overflow: hidden;
    outline: none;
    padding-block-end: max(16px, env(safe-area-inset-bottom));
    padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
    font-family: var(--font-sans);
  }

  /* Aligns the title and the named dismissal control. */
  .quick-prompts-sheet--header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: 0.25rem 0.75rem;
    padding-inline: var(--space-4);
  }

  /* Gives the sheet heading the same visual weight as prompt history. */
  :global(.quick-prompts-sheet--title) {
    margin: 0;
    color: var(--ink);
    font-size: 1.125rem;
    font-weight: 650;
  }

  /* Keeps the close icon target large enough and discoverable to assistive technology. */
  :global(.quick-prompts-sheet--close) {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    cursor: pointer;
  }

  /* Gives the named close control a quiet hover state. */
  :global(.quick-prompts-sheet--close[data-hovered]) {
    background: var(--surface-muted);
  }

  /* Explains the empty local state without presenting a storage error. */
  .quick-prompts-sheet--empty {
    padding: var(--space-8) var(--space-4);
    color: var(--ink-muted);
    text-align: center;
    font-size: 0.875rem;
  }

  /* Allows saved chips to scroll without moving the page behind the sheet. */
  .quick-prompts-sheet--list {
    flex: 0 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-gutter: stable;
    padding: var(--space-1);
  }

  /* Makes each saved prompt a full-width, finger-sized chip. */
  .quick-prompts-sheet--row {
    display: flex;
    width: 100%;
    align-items: flex-start;
    padding: var(--space-3) var(--space-3);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    font-size: 0.875rem;
    line-height: 1.4;
    cursor: pointer;
    word-break: break-word;
  }

  /* Makes keyboard and pointer activation visible without relying on color alone. */
  :global(.quick-prompts-sheet--row[data-hovered]),
  :global(.quick-prompts-sheet--row[data-pressed]) {
    background: var(--accent-soft);
  }

  /* Keeps keyboard focus visible against the sheet surface. */
  :global(.quick-prompts-sheet--row[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: -2px;
  }

  /* Prevents long labels from forcing the sheet wider than the viewport. */
  .quick-prompts-sheet--text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Enters the scrim without shifting the sheet content. */
  @keyframes quick-prompts-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Leaves the scrim before the overlay is removed. */
  @keyframes quick-prompts-backdrop-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  /* Slides the sheet into view from the bottom edge. */
  @keyframes quick-prompts-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* Slides the sheet out without changing the draft. */
  @keyframes quick-prompts-sheet-out {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }
</style>
