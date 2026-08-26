<script module lang="ts">
  // This module holds the shared Session Header types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RuntimeControls } from '$shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export type ThemePreference = 'system' | 'light' | 'dark';

  export interface SessionHeaderProps {
    readonly onBack: () => void;
    readonly onInbox: () => void;
    readonly onReview: () => void;
    readonly theme: ThemePreference;
    readonly onThemeChange: (theme: ThemePreference) => void;
    readonly runtimeControls: RuntimeControls;
    /** Whether the shared model/effort sheet is open (for aria-expanded). */
    readonly sheetOpen: boolean;
    /** Opens the shared sheet at the model section. */
    readonly onOpenModelSheet: () => void;
    /** Attached to the readout trigger so the sheet can restore focus to it. */
    modelTriggerRef?: HTMLButtonElement | null;
    readonly sessionId?: string;
    readonly slashCommandNames?: readonly string[];
    readonly onRefreshSession?: () => void;
    readonly onOpenTranscript?: () => void;
    readonly onForwardSlash?: (name: string) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const THEME_OPTIONS = ['system', 'light', 'dark'] as const;
  const SESSION_SLASH_COMMANDS = ['rename', 'archive', 'new', 'fork'] as const;

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep theme option label focused on its single responsibility.
  function themeOptionLabel(option: ThemePreference): string {
    return option === 'system' ? 'Auto' : option === 'light' ? 'Light' : 'Dark';
  }

  // Plain buttons lack react-aria interaction attrs; bridge hover/focus-visible manually.
  function onChromePointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    (event.currentTarget as HTMLElement).setAttribute('data-hovered', 'true');
  }

  // Keep on chrome pointer leave focused on its single responsibility.
  function onChromePointerLeave(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).removeAttribute('data-hovered');
  }

  // Keep on chrome focus focused on its single responsibility.
  function onChromeFocus(event: FocusEvent): void {
    const node = event.currentTarget as HTMLElement;
    if (node.matches(':focus-visible')) node.setAttribute('data-focus-visible', 'true');
    else node.removeAttribute('data-focus-visible');
  }

  // Keep on chrome blur focused on its single responsibility.
  function onChromeBlur(event: FocusEvent): void {
    (event.currentTarget as HTMLElement).removeAttribute('data-focus-visible');
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 5. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { modelEffortTriggerName, effortTriggerText } from '$shared/catalog/effort.js';
  import { modelSwitcherStrings } from '$shared/catalog/model-switcher-strings.js';
  import { Popover } from 'bits-ui';
  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';
  import Button from '$shared/primitives/button/button.svelte';
  import { useCopyFeedback } from '../rich-content/use-copy-feedback.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 6. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    onBack,
    onInbox,
    onReview,
    theme,
    onThemeChange,
    runtimeControls,
    sheetOpen,
    onOpenModelSheet,
    modelTriggerRef = $bindable(null),
    sessionId = '',
    slashCommandNames = [],
    onRefreshSession,
    onOpenTranscript,
    onForwardSlash,
  }: SessionHeaderProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 7. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let overflowOpen = $state(false);
  let overflowContentEl = $state<HTMLElement | null>(null);
  let overflowDialogEl = $state<HTMLElement | null>(null);
  const copyFeedback = useCopyFeedback();

  // ───────────────────────────────────────────────────────────────────
  // 8. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const runtime = $derived(runtimeControls.runtime);
  const snapshot = $derived(runtime.state);
  const modelLabel = $derived(snapshot?.model?.label ?? 'Model');
  const modelProvider = $derived(snapshot?.model?.provider ?? 'unknown provider');
  const effortText = $derived(
    effortTriggerText(snapshot?.thinkingLevel, snapshot?.availableThinkingLevels ?? []),
  );
  const availableSlash = $derived(new Set(slashCommandNames));

  // ───────────────────────────────────────────────────────────────────
  // 9. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (overflowContentEl === null) return;
    return hideOutside([overflowContentEl]);
  });
</script>

<!-- Component content -->
<!-- Session header -->
<!-- This surface: session-header — quiet in-session header. Slots: back · model · overflow. -->
<header class="session-header">
  <!-- This slot: back — back-to-sessions control. -->
  <!-- Do not edit — react-aria Button (onPress / aria-label) — Not designer-editable. -->
  <Button class="session-header--icon" aria-label="Back to sessions" onclick={onBack}>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </Button>

  <!-- This slot: model — host-confirmed model / effort readout trigger. -->
  <div class="session--runtime-controls">
    <!-- Do not edit — react-aria Button + aria-* (expanded/controls/haspopup); 44px target — Not designer-editable. -->
    <Button
      class="session-model--trigger"
      aria-label={modelEffortTriggerName(modelLabel, modelProvider, effortText)}
      aria-haspopup="dialog"
      aria-expanded={sheetOpen}
      aria-controls="model-effort-dialog"
      style="min-block-size: 44px"
      onclick={onOpenModelSheet}
      {@attach (node) => {
        modelTriggerRef = node as HTMLButtonElement;
        return () => {
          if (modelTriggerRef === node) modelTriggerRef = null;
        };
      }}
    >
      {#key `${snapshot?.model?.provider ?? ''}:${snapshot?.model?.id ?? ''}`}
        <span class="session-model--name">{modelLabel}</span>
      {/key}
      <span class="session-header--sep" aria-hidden="true">·</span>
      {#key `effort:${snapshot?.thinkingLevel ?? ''}`}
        <span class="session--effort-name">{effortText}</span>
      {/key}
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path
          d="M6 9l6 6 6-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </Button>

    <!-- This slot: plan-badge — plan-mode status chip. -->
    <!-- Do not edit — role="status" readout — Not designer-editable. -->
    {#if snapshot?.mode === 'plan'}
      <span class="session--plan-badge" role="status" aria-label={modelSwitcherStrings.planMode}>
        {modelSwitcherStrings.planBadge}
      </span>
    {/if}
  </div>

  <!-- This slot: overflow — nav + theme popover trigger. -->
  <!-- Do not edit — react-aria DialogTrigger / Popover / Dialog wiring — Not designer-editable. -->
  <Popover.Root bind:open={overflowOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          aria-haspopup={undefined}
          class="session-header--icon"
          aria-label="More: navigation and theme"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <circle cx="5" cy="12" r="1.7" fill="currentColor" />
            <circle cx="12" cy="12" r="1.7" fill="currentColor" />
            <circle cx="19" cy="12" r="1.7" fill="currentColor" />
          </svg>
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="session--sheet-popover"
      side="bottom"
      align="end"
      bind:ref={overflowContentEl}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        overflowDialogEl?.focus();
      }}
    >
      <button
        type="button"
        class="sr-only"
        tabindex="-1"
        aria-label="Dismiss"
        onclick={() => {
          overflowOpen = false;
        }}
      ></button>
      <div
        class="session-sheet"
        role="dialog"
        aria-label="Navigation and theme"
        tabindex="-1"
        bind:this={overflowDialogEl}
      >
        <section class="tools--group">
          <span class="tools--label">Go to</span>
          <!-- This slot: nav — Inbox · Review. -->
          <!-- Do not edit — react-aria onPress nav routing — Not designer-editable. -->
          <div class="overflow--nav">
            <Button class="overflow--item" onclick={onInbox}>Inbox</Button>
            <Button class="overflow--item" onclick={onReview}>Review</Button>
          </div>
        </section>
        <section class="tools--group">
          <span class="tools--label">Theme</span>
          <!-- This slot: theme-toggle — segmented light / dark / auto. -->
          <!-- Do not edit — react-aria ToggleButton group (onChange / aria-label) — Not designer-editable. -->
          <div class="theme--control" role="group" aria-label="Color theme">
            {#each THEME_OPTIONS as option (option)}
              <button
                type="button"
                class="theme--option"
                aria-pressed={theme === option}
                data-selected={theme === option ? true : undefined}
                aria-label={`Use ${option} theme`}
                onclick={() => {
                  if (theme !== option) onThemeChange(option);
                }}
                onpointerenter={onChromePointerEnter}
                onpointerleave={onChromePointerLeave}
                onpointercancel={onChromePointerLeave}
                onfocus={onChromeFocus}
                onblur={onChromeBlur}
              >
                {themeOptionLabel(option)}
              </button>
            {/each}
          </div>
        </section>
        <section class="tools--group">
          <span class="tools--label">Session</span>
          <div class="overflow--nav">
            <Button
              class="overflow--item"
              disabled={onOpenTranscript === undefined}
              onclick={() => {
                onOpenTranscript?.();
                overflowOpen = false;
              }}
            >
              Open transcript
              {#if onOpenTranscript === undefined}
                <span class="overflow--hint">Unavailable in this view</span>
              {/if}
            </Button>
            <Button
              class="overflow--item"
              disabled={sessionId.length === 0 || !copyFeedback.canCopy}
              onclick={() => {
                if (sessionId.length === 0) return;
                copyFeedback.copy('session-id', sessionId);
              }}
            >
              {copyFeedback.copiedUnit === 'session-id' && !copyFeedback.copyFailed
                ? 'Copied'
                : 'Copy session id'}
              {#if sessionId.length === 0}
                <span class="overflow--hint">No session id</span>
              {:else if !copyFeedback.canCopy}
                <span class="overflow--hint">Clipboard unavailable</span>
              {/if}
            </Button>
            <Button
              class="overflow--item"
              disabled={onRefreshSession === undefined}
              onclick={() => {
                onRefreshSession?.();
                overflowOpen = false;
              }}
            >
              Refresh session
              {#if onRefreshSession === undefined}
                <span class="overflow--hint">Unavailable in this view</span>
              {/if}
            </Button>
            {#each SESSION_SLASH_COMMANDS as name (name)}
              {@const available = availableSlash.has(name)}
              <Button
                class="overflow--item"
                disabled={!available || onForwardSlash === undefined}
                onclick={() => {
                  if (!available) return;
                  onForwardSlash?.(name);
                  overflowOpen = false;
                }}
              >
                /{name}
                {#if !available}
                  <span class="overflow--hint">Not available from the host</span>
                {/if}
              </Button>
            {/each}
          </div>
          {#if copyFeedback.announcement.length > 0}
            <p class="sr-only" role="status" aria-live="polite">{copyFeedback.announcement}</p>
          {/if}
        </section>
      </div>
      <button
        type="button"
        class="sr-only"
        tabindex="-1"
        aria-label="Dismiss"
        onclick={() => {
          overflowOpen = false;
        }}
      ></button>
    </Popover.Content>
  </Popover.Root>
</header>

<!-- Session header -->
<!-- This surface: session-header — quiet in-session header. Decomposed into this scoped block;
     overflow--nav / overflow--item are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
<style>
  /* This surface: session-sheet — in-session overflow popover (nav · theme), shared chrome with the composer toolset. */
  /* This slot: tools-popover — the "+" popover chrome; shared with the session-sheet surface. */
  :global(.session--sheet-popover) {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  /* This surface: session-header — in-session quiet header (back · model · overflow). */
  /* Editable seam: layout — grid geometry + safe top gutter. */
  /* ── Session header (in-session): back · centered model · overflow ─────── */
  .session-header {
    position: sticky;
    top: 0;
    z-index: 6;
    display: grid;
    grid-template-columns: 2.75rem 1fr 2.75rem;
    align-items: center;
    gap: var(--space-2);
    padding: max(var(--space-2), env(safe-area-inset-top)) var(--page-gutter) var(--space-2);
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklch, var(--canvas) 90%, transparent);
    backdrop-filter: blur(12px);
  }

  /* This slot: icon — back and overflow icon buttons. */
  :global(.session-header--icon) {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-header--icon:last-child) {
    justify-self: end;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-header--icon[data-hovered]) {
    background: var(--surface-muted);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-header--icon[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: model — host-confirmed model/effort readout trigger. */
  :global(.session-model--trigger) {
    display: inline-flex;
    min-inline-size: 44px;
    min-block-size: 44px;
    flex: 1 1 auto;
    justify-self: center;
    align-items: center;
    gap: 0.35rem;
    max-width: 100%;
    padding: 0.4rem 0.85rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink);
    font-size: 1rem;
    font-weight: 620;
    cursor: pointer;
    overflow: hidden;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-model--trigger[data-hovered]) {
    background: var(--surface-muted);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-model--trigger[data-disabled]) {
    cursor: default;
    opacity: 0.6;
  }

  /* This slot: model-name — confirmed model label. */
  .session-model--name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    animation: model-header-accepted 150ms ease-out;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .session--runtime-controls {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    overflow: hidden;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session-model--trigger[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: separator — between model and effort. */
  .session-header--sep {
    color: var(--ink-muted);
    font-size: 0.85rem;
    font-weight: 400;
  }

  /* This slot: effort-name — confirmed effort label. */
  .session--effort-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-secondary);
    font-size: 0.8rem;
    font-weight: 560;
  }

  /* This slot: plan-badge — plan-mode status chip. */
  .session--plan-badge {
    flex: 0 0 auto;
    padding-block: 0.2rem;
    padding-inline: 0.45rem;
    border: 1px solid var(--accent-strong);
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 0.68rem;
    font-weight: 700;
  }
  /* End of surface: session-header */

  @keyframes model-header-accepted {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (max-width: 360px) {
    /* Keep this rule aligned with its surrounding surface. */
    :global(.session-model--trigger) {
      padding-inline: 0.55rem;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .session-header--sep {
      display: none;
    }
  }

  /* This slot: nav — Inbox · Review overflow items. */
  .overflow--nav {
    display: grid;
    gap: var(--space-1);
  }

  /* This slot: nav-item */
  :global(.overflow--item) {
    display: flex;
    flex-direction: column;
    min-height: 2.5rem;
    align-items: flex-start;
    gap: 0.15rem;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ink);
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
  }

  /* This state: hover */
  :global(.overflow--item[data-hovered]) {
    background: var(--surface-muted);
  }

  :global(.overflow--item[data-disabled]) {
    color: var(--ink-muted);
    cursor: default;
  }

  .overflow--hint {
    display: block;
    color: var(--ink-muted);
    font-size: 0.75rem;
    font-weight: 500;
  }
</style>
