<script module lang="ts">
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
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const THEME_OPTIONS = ['system', 'light', 'dark'] as const;

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function themeOptionLabel(option: ThemePreference): string {
    return option === 'system' ? 'Auto' : option === 'light' ? 'Light' : 'Dark';
  }

  // Plain theme buttons do not emit react-aria data-hovered / data-focus-visible;
  // Pointer + focus-visible hooks match the Button primitive's interaction actions.
  function onChromePointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    (event.currentTarget as HTMLElement).setAttribute('data-hovered', 'true');
  }

  function onChromePointerLeave(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).removeAttribute('data-hovered');
  }

  function onChromeFocus(event: FocusEvent): void {
    const node = event.currentTarget as HTMLElement;
    if (node.matches(':focus-visible')) node.setAttribute('data-focus-visible', 'true');
    else node.removeAttribute('data-focus-visible');
  }

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

  import './session-header.css';

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
  }: SessionHeaderProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 7. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let overflowOpen = $state(false);
  let overflowContentEl = $state<HTMLElement | null>(null);
  let overflowDialogEl = $state<HTMLElement | null>(null);

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

  // ───────────────────────────────────────────────────────────────────
  // 9. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    if (overflowContentEl === null) return;
    return hideOutside([overflowContentEl]);
  });
</script>

<!-- @ds surface: session-header — quiet in-session header. Slots: back · model · overflow. -->
<header class="session-header">
  <!-- @ds slot: back — back-to-sessions control. -->
  <!-- @ds guardrail: react-aria Button (onPress / aria-label) — Not designer-editable. -->
  <Button class="session-header-icon" aria-label="Back to sessions" onclick={onBack}>
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

  <!-- @ds slot: model — host-confirmed model / effort readout trigger. -->
  <div class="session-runtime-controls">
    <!-- @ds guardrail: react-aria Button + aria-* (expanded/controls/haspopup); 44px target — Not designer-editable. -->
    <Button
      class="session-model-trigger"
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
        <span class="session-model-name">{modelLabel}</span>
      {/key}
      <span class="session-header-sep" aria-hidden="true">·</span>
      {#key `effort:${snapshot?.thinkingLevel ?? ''}`}
        <span class="session-effort-name">{effortText}</span>
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

    <!-- @ds slot: plan-badge — plan-mode status chip. -->
    <!-- @ds guardrail: role="status" readout — Not designer-editable. -->
    {#if snapshot?.mode === 'plan'}
      <span class="session-plan-badge" role="status" aria-label={modelSwitcherStrings.planMode}>
        {modelSwitcherStrings.planBadge}
      </span>
    {/if}
  </div>

  <!-- @ds slot: overflow — nav + theme popover trigger. -->
  <!-- @ds guardrail: react-aria DialogTrigger / Popover / Dialog wiring — Not designer-editable. -->
  <Popover.Root bind:open={overflowOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          aria-haspopup={undefined}
          class="session-header-icon"
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
      class="session-sheet-popover"
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
        <section class="tools-group">
          <span class="tools-label">Go to</span>
          <!-- @ds slot: nav — Inbox · Review. -->
          <!-- @ds guardrail: react-aria onPress nav routing — Not designer-editable. -->
          <div class="overflow-nav">
            <Button class="overflow-item" onclick={onInbox}>Inbox</Button>
            <Button class="overflow-item" onclick={onReview}>Review</Button>
          </div>
        </section>
        <section class="tools-group">
          <span class="tools-label">Theme</span>
          <!-- @ds slot: theme-toggle — segmented light / dark / auto. -->
          <!-- @ds guardrail: react-aria ToggleButton group (onChange / aria-label) — Not designer-editable. -->
          <div class="theme-control" role="group" aria-label="Color theme">
            {#each THEME_OPTIONS as option (option)}
              <button
                type="button"
                class="theme-option"
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

<!-- @ds surface: session-header — quiet in-session header. Decomposed into this co-located CSS file;
     overflow-nav / overflow-item are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
