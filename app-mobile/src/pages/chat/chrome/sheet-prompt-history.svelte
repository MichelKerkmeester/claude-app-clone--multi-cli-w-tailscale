<script module lang="ts">
  // This module holds the shared Prompt History Sheet types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface PromptHistorySheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** Called with the selected prompt text to fill the composer draft. */
    readonly onSelectHistory: (prompt: string) => void;
    /** The trigger that opened the sheet; focus returns here on close. */
    triggerRef?: HTMLButtonElement | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { readPromptHistory } from '$shared/state/state.js';
  import { press, hover, focused, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetClose from '$shared/primitives/sheet/sheet-close.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    onSelectHistory,
    triggerRef = null,
  }: PromptHistorySheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // eslint-disable-next-line svelte/prefer-writable-derived
  let sheetOpen = $state(false);
  let dialogEl = $state<HTMLElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Re-read the history list every time the sheet opens.
  const history = $derived.by(() => {
    if (!sheetOpen) return [];
    return readPromptHistory();
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    sheetOpen = isOpen;
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep restore trigger focus focused on its single responsibility.
  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  // Keep close focused on its single responsibility.
  const close = () => {
    onOpenChange(false);
    restoreTriggerFocus();
  };

  // Keep on sheet open change focused on its single responsibility.
  function onSheetOpenChange(next: boolean): void {
    if (!next) {
      onOpenChange(false);
      restoreTriggerFocus();
    } else {
      onOpenChange(true);
    }
  }

  // Keep on open auto focus focused on its single responsibility.
  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
  }

  // Keep on close auto focus focused on its single responsibility.
  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreTriggerFocus();
  }

  function handleSelect(text: string): void {
    onSelectHistory(text);
    close();
  }

  // ───────────────────────────────────────────────────────────────────
  // 9. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep attach row interactions focused on its single responsibility.
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

  // Keep attach dialog focused on its single responsibility.
  function attachDialog(node: Element): () => void {
    const el = node as HTMLElement;
    dialogEl = el;
    return () => {
      if (dialogEl === el) dialogEl = null;
    };
  }
</script>

<!-- Component content -->
<!-- Prompt history sheet -->
<!-- This surface: prompt-history-sheet — device-local recall modal overlay. -->
<Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
  <SheetContent
    class="prompt-history-sheet--overlay"
    id="prompt-history-dialog"
    aria-labelledby="prompt-history-title"
    trapFocus={true}
    interactOutsideBehavior="close"
    escapeKeydownBehavior="close"
    onOpenAutoFocus={onOpenAutoFocus}
    onCloseAutoFocus={onCloseAutoFocus}
  >
    <div class="prompt-history-sheet--modal">
      <div class="prompt-history-sheet--dialog" {@attach attachDialog}>
        <header class="prompt-history-sheet--header">
          <SheetTitle id="prompt-history-title" class="prompt-history-sheet--title">
            Recent prompts
          </SheetTitle>
          <SheetClose
            class="prompt-history-sheet--close"
            aria-label="Close prompt history"
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

        {#if history.length === 0}
          <p class="prompt-history-sheet--empty">
            No recent prompts yet.
          </p>
        {:else}
          <div
            class="prompt-history-sheet--list"
            role="listbox"
            aria-label="Recent prompts"
          >
            {#each history as text (text)}
              <button
                type="button"
                class="prompt-history-sheet--row"
                role="option"
                aria-selected={false}
                onclick={() => handleSelect(text)}
                onkeydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(text);
                  }
                }}
                style="min-block-size: 44px; text-align: start"
                {@attach attachRowInteractions}
              >
                <span class="prompt-history-sheet--text">{text}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </SheetContent>
</Sheet>

<!-- Prompt history sheet -->
<style>
  /* This surface: prompt-history-sheet — recall overlay. */
  :global(.prompt-history-sheet--overlay) {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    max-inline-size: 100vw;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: var(--scrim);
    animation: prompt-history-backdrop-in 180ms ease-out;
  }

  :global(.prompt-history-sheet--overlay[data-exiting]) {
    animation: prompt-history-backdrop-out 220ms ease-in;
  }

  .prompt-history-sheet--modal {
    inline-size: min(92vw, 24rem);
    max-inline-size: 100vw;
    max-block-size: calc(var(--visual-viewport-height, 100dvh) * 0.75);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--ink);
    animation: prompt-history-sheet-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  :global(.prompt-history-sheet--overlay[data-exiting]) .prompt-history-sheet--modal {
    animation: prompt-history-sheet-out 220ms ease-in;
  }

  .prompt-history-sheet--dialog {
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

  .prompt-history-sheet--header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: 0.25rem 0.75rem;
    padding-inline: var(--space-4);
  }

  :global(.prompt-history-sheet--title) {
    margin: 0;
    color: var(--ink);
    font-size: 1.125rem;
    font-weight: 650;
  }

  :global(.prompt-history-sheet--close) {
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

  :global(.prompt-history-sheet--close[data-hovered]) {
    background: var(--surface-muted);
  }

  .prompt-history-sheet--empty {
    padding: var(--space-8) var(--space-4);
    color: var(--ink-muted);
    text-align: center;
    font-size: 0.875rem;
  }

  .prompt-history-sheet--list {
    flex: 0 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-gutter: stable;
    padding: var(--space-1);
  }

  .prompt-history-sheet--row {
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

  :global(.prompt-history-sheet--row[data-hovered]),
  :global(.prompt-history-sheet--row[data-pressed]) {
    background: var(--accent-soft);
  }

  :global(.prompt-history-sheet--row[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: -2px;
  }

  .prompt-history-sheet--text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  @keyframes prompt-history-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes prompt-history-backdrop-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes prompt-history-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes prompt-history-sheet-out {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }
</style>