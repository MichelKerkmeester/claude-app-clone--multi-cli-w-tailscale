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

  import './theme-control.css';

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
<div class="theme-control" role="group" aria-label="Color theme">
  <!-- @ds guardrail: react-aria ToggleButton wiring (isSelected/onChange/aria-label) — not designer-editable. -->
  <!-- Nest the options so the segmented control keeps its fitting width at 390px; the wrapper is presentational. -->
  <div>
    {#each themes as theme (theme)}
      <button
        type="button"
        class="theme-option"
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

<!-- @ds surface: theme-switcher — segmented theme selector (ToggleButton group). Decomposed into this co-located CSS file;
     theme-control is owned solely by this component so it moves with it. .theme-option is
     on the ToggleGroupItem primitive so it uses :global. The grouped .nav-button, .theme-option,
     .back-button base + hover rules stay GLOBAL in app.css (unchanged) so their byte-for-byte
     structure is preserved. Values unchanged. -->
