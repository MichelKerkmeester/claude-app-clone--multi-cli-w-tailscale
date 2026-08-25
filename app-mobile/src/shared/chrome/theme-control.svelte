<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: THEME CONTROL
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ThemePreference } from '../format/view-helpers.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface ThemeControlProps {
    readonly value: ThemePreference;
    readonly onChange: (value: ThemePreference) => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { focusVisible, focused, hover } from '../primitives/a11y/interactions.js';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    value,
    onChange,
  }: ThemeControlProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const themes = ['system', 'light', 'dark'] as const;

  // ───────────────────────────────────────────────────────────────────
  // 6. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function attachThemeOptionInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const hoverAction = hover(el);
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    return () => {
      if (hoverAction) hoverAction.destroy?.();
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
    };
  }
</script>

<!-- @ds surface: theme-switcher — segmented theme selector. react-aria owns selection. -->
<div class="theme--control" role="group" aria-label="Color theme">
  <!-- @ds guardrail: react-aria ToggleButton wiring (isSelected/onChange/aria-label) — not designer-editable. -->
  <!-- Inner wrapper keeps the segmented control fitting at 390px. -->
  <div>
    {#each themes as theme (theme)}
      <button
        type="button"
        class="theme--option"
        aria-pressed={value === theme}
        data-selected={value === theme ? true : undefined}
        aria-label={`Use ${theme} theme`}
        onclick={() => {
          if (value !== theme) onChange(theme);
        }}
        {@attach attachThemeOptionInteractions}
      >
        {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
      </button>
    {/each}
  </div>
</div>

<!-- @ds surface: theme-switcher — segmented theme selector (ToggleButton group). Decomposed into this scoped block;
     theme--control is owned solely by this component so it moves with it. .theme--option is
     on the ToggleGroupItem primitive so it uses :global. The grouped .nav-button, .theme--option,
     .back-button base + hover rules stay GLOBAL in app.css (unchanged) so their byte-for-byte
     structure is preserved. Values unchanged. -->
<style>
  /* @ds slot: theme-toggle — segmented theme control (shared theme-switcher surface below). */
  /* @ds surface: theme-switcher — segmented theme selector (ToggleButton group). */
  .theme--control {
    display: flex;
    padding: 0.2rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  /* @ds state: default */
  :global(.theme--option) {
    min-height: 2.25rem;
    padding-inline: 0.65rem;
    font-size: 0.68rem;
  }

  /* @ds state: selected */
  :global(.theme--option[data-selected]) {
    background: var(--ink);
    color: var(--ink-inverse);
  }
  /* @ds end surface: theme-switcher */

  @media (max-width: 52rem) {
    :global(.theme--option) {
      width: 2.4rem;
      overflow: hidden;
      color: transparent;
      font-size: 0;
    }

    :global(.theme--option::before) {
      color: var(--ink-secondary);
      font-size: 0.72rem;
      content: 'A';
    }

    :global(.theme--option:nth-child(2)::before) {
      content: '☀';
    }
    :global(.theme--option:nth-child(3)::before) {
      content: '●';
    }
    :global(.theme--option[data-selected]::before) {
      color: var(--ink-inverse);
    }
  }

  @media (max-width: 39rem) {
    .theme--control {
      order: 3;
    }
  }
</style>
