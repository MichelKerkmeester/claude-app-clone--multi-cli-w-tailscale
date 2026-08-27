<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: DICTATION SETUP SHEET
  // ───────────────────────────────────────────────────────────────────
  // Fail-closed setup sheet for dictation. Shows engine status, a
  // None/off row, and placeholder model download states for the
  // host-hosted-STT-model future. Language-hint select is shown when
  // dictation is supported.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { press, hover, focused, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetClose from '$shared/primitives/sheet/sheet-close.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const SUPPORTED_LANGUAGES: readonly { readonly value: string; readonly label: string }[] = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'de-DE', label: 'German' },
    { value: 'fr-FR', label: 'French' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'nl-NL', label: 'Dutch' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
  ];

  export type EngineStatus = 'available' | 'unavailable' | 'loading';

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface DictationSheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** The trigger that opened the sheet; focus returns here on close. */
    triggerRef?: HTMLButtonElement | null;
    /** Current engine status — available, unavailable, or loading. */
    readonly engineStatus: EngineStatus;
    /** Whether dictation is actively enabled (not None/off). */
    readonly dictationEnabled: boolean;
    /** Called to toggle dictation on/off (None/off row). */
    readonly onToggleEnabled: (enabled: boolean) => void;
    /** Current language hint. */
    readonly lang: string;
    /** Called when the language hint changes. */
    readonly onLangChange: (lang: string) => void;
    /** Status message for the engine row. */
    readonly engineMessage: string;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    triggerRef = null,
    engineStatus = 'available',
    dictationEnabled = true,
    onToggleEnabled,
    lang = 'auto',
    onLangChange,
    engineMessage = '',
  }: DictationSheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // eslint-disable-next-line svelte/prefer-writable-derived
  let sheetOpen = $state(false);
  let dialogEl = $state<HTMLElement | null>(null);
  let announcement = $state('');

  // ───────────────────────────────────────────────────────────────────
  // 6. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    sheetOpen = isOpen;
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  function onSheetOpenChange(next: boolean): void {
    if (!next) {
      onOpenChange(false);
      restoreTriggerFocus();
    } else {
      onOpenChange(true);
    }
  }

  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
  }

  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreTriggerFocus();
  }

  function handleToggleEnabled(): void {
    onToggleEnabled(!dictationEnabled);
    announcement = dictationEnabled ? 'Dictation turned off.' : 'Dictation turned on.';
  }

  function attachDialog(node: HTMLElement): () => void {
    dialogEl = node;
    return () => {
      if (dialogEl === node) dialogEl = null;
    };
  }

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
</script>

<!-- Component content -->
<!-- Dictation setup sheet -->
<!-- This surface: dictation-sheet — fail-closed setup overlay. -->
{#if isOpen}
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
  {announcement}
</div>
{/if}
<Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
  <SheetContent
    class="dictation-sheet--overlay"
    id="dictation-sheet-dialog"
    aria-labelledby="dictation-sheet-title"
    trapFocus={true}
    interactOutsideBehavior="close"
    escapeKeydownBehavior="close"
    onOpenAutoFocus={onOpenAutoFocus}
    onCloseAutoFocus={onCloseAutoFocus}
  >
    <div class="dictation-sheet--modal">
      <div class="dictation-sheet--dialog" {@attach attachDialog}>
        <header class="dictation-sheet--header">
          <SheetTitle id="dictation-sheet-title" class="dictation-sheet--title">
            Dictation
          </SheetTitle>
          <SheetClose
            class="dictation-sheet--close"
            aria-label="Close dictation setup"
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

        <div class="dictation-sheet--body">
          <!-- Engine status row -->
          {#if engineStatus === 'loading'}
            <div class="dictation-sheet--engine-status" aria-busy="true">
              <span class="dictation-sheet--engine-dot is-loading"></span>
              <span class="dictation-sheet--engine-label">Checking engine…</span>
            </div>
          {:else if engineStatus === 'unavailable'}
            <div class="dictation-sheet--engine-status">
              <span class="dictation-sheet--engine-dot is-unavailable"></span>
              <span class="dictation-sheet--engine-label">{engineMessage || 'Dictation not available in this browser.'}</span>
            </div>
          {:else}
            <div class="dictation-sheet--engine-status">
              <span class="dictation-sheet--engine-dot is-available"></span>
              <span class="dictation-sheet--engine-label">{engineMessage || 'On-device dictation ready.'}</span>
            </div>
          {/if}

          <!-- None/off row -->
          <div class="dictation-sheet--row">
            <button
              type="button"
              class="dictation-sheet--toggle"
              role="switch"
              aria-checked={dictationEnabled}
              onclick={handleToggleEnabled}
              style="min-block-size: 44px"
              {@attach attachRowInteractions}
            >
              <span class="dictation-sheet--toggle-label">
                {dictationEnabled ? 'On' : 'Off'}
              </span>
              <span class="dictation-sheet--toggle-indicator">
                <span class="dictation-sheet--toggle-knob"></span>
              </span>
            </button>
            <span class="dictation-sheet--row-label">
              {dictationEnabled ? 'Dictation is on' : 'Dictation is off'}
            </span>
          </div>

          <!-- Host-hosted model placeholder (⚠️ inert until host provides a model) -->
          <section class="dictation-sheet--section" aria-labelledby="dictation-model-label">
            <span class="dictation-sheet--section-label" id="dictation-model-label">
              Speech Model
            </span>
            <div class="dictation-sheet--model-placeholder">
              <span class="dictation-sheet--placeholder-text">
                Model download is not yet available.
              </span>
              <span class="dictation-sheet--placeholder-hint">
                This will be available when a host-provided speech model is configured.
              </span>
            </div>
          </section>

          <!-- Language hint select (only when dictation ships) -->
          {#if engineStatus === 'available' || engineStatus === 'unavailable'}
            <section class="dictation-sheet--section" aria-labelledby="dictation-lang-label">
              <label for="dictation-lang-select" class="dictation-sheet--section-label" id="dictation-lang-label">
                Language
              </label>
              <select
                id="dictation-lang-select"
                class="dictation-sheet--select"
                value={lang}
                onchange={(event) => {
                  const target = event.currentTarget;
                  onLangChange(target.value);
                }}
                style="min-block-size: 44px"
              >
                {#each SUPPORTED_LANGUAGES as option (option.value)}
                  <option value={option.value} selected={option.value === lang}>
                    {option.label}
                  </option>
                {/each}
              </select>
            </section>
          {/if}
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>

<!-- Dictation sheet -->
<style>
  /* This surface: dictation-sheet — fail-closed setup overlay. */
  :global(.dictation-sheet--overlay) {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    max-inline-size: 100vw;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: var(--scrim);
    animation: dictation-sheet-backdrop-in 180ms ease-out;
  }

  :global(.dictation-sheet--overlay[data-exiting]) {
    animation: dictation-sheet-backdrop-out 220ms ease-in;
  }

  .dictation-sheet--modal {
    inline-size: min(92vw, 24rem);
    max-inline-size: 100vw;
    max-block-size: calc(var(--visual-viewport-height, 100dvh) * 0.75);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    background: var(--surface);
    color: var(--ink);
    animation: dictation-sheet-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  :global(.dictation-sheet--overlay[data-exiting]) .dictation-sheet--modal {
    animation: dictation-sheet-out 220ms ease-in;
  }

  .dictation-sheet--dialog {
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

  .dictation-sheet--header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: 0.25rem 0.75rem;
    padding-inline: var(--space-4);
  }

  :global(.dictation-sheet--title) {
    margin: 0;
    color: var(--ink);
    font-size: 1.125rem;
    font-weight: 650;
  }

  :global(.dictation-sheet--close) {
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

  :global(.dictation-sheet--close[data-hovered]) {
    background: var(--surface-muted);
  }

  .dictation-sheet--body {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4) var(--space-4);
  }

  .dictation-sheet--engine-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: 10px;
    background: var(--surface-muted);
  }

  .dictation-sheet--engine-dot {
    inline-size: 8px;
    block-size: 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .dictation-sheet--engine-dot.is-available {
    background: var(--success);
  }

  .dictation-sheet--engine-dot.is-unavailable {
    background: var(--danger);
  }

  .dictation-sheet--engine-dot.is-loading {
    background: var(--ink-muted);
    animation: dictation-sheet-pulse 1s ease-in-out infinite;
  }

  .dictation-sheet--engine-label {
    font-size: 0.875rem;
    color: var(--ink-secondary);
  }

  .dictation-sheet--row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .dictation-sheet--toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--ink);
  }

  :global(.dictation-sheet--toggle[data-hovered]),
  :global(.dictation-sheet--toggle[data-pressed]) {
    background: var(--surface-muted);
  }

  :global(.dictation-sheet--toggle[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .dictation-sheet--toggle-label {
    font-weight: 600;
  }

  .dictation-sheet--toggle-indicator {
    display: inline-flex;
    inline-size: 2.25rem;
    block-size: 1.25rem;
    align-items: center;
    border-radius: 999px;
    background: var(--control-border);
    padding: 2px;
    transition: background 200ms ease;
  }

  .dictation-sheet--toggle[aria-checked='true'] .dictation-sheet--toggle-indicator {
    background: var(--accent);
  }

  .dictation-sheet--toggle-knob {
    display: block;
    inline-size: 1rem;
    block-size: 1rem;
    border-radius: 999px;
    background: var(--on-accent);
    transition: transform 200ms ease;
  }

  .dictation-sheet--toggle[aria-checked='true'] .dictation-sheet--toggle-knob {
    transform: translateX(1rem);
  }

  .dictation-sheet--row-label {
    font-size: 0.875rem;
    color: var(--ink-muted);
  }

  .dictation-sheet--section {
    display: grid;
    gap: var(--space-2);
  }

  .dictation-sheet--section-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--ink-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dictation-sheet--model-placeholder {
    padding: var(--space-3);
    border: 1px dashed var(--line);
    border-radius: 10px;
    display: grid;
    gap: var(--space-1);
  }

  .dictation-sheet--placeholder-text {
    font-size: 0.875rem;
    color: var(--ink-muted);
  }

  .dictation-sheet--placeholder-hint {
    font-size: 0.75rem;
    color: var(--ink-disabled);
  }

  .dictation-sheet--select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .dictation-sheet--select:focus {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }

  @keyframes dictation-sheet-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes dictation-sheet-backdrop-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes dictation-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes dictation-sheet-out {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }

  @keyframes dictation-sheet-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
</style>