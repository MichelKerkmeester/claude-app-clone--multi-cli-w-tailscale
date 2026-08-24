<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: HEADER
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ConnectionPhase } from '../state/state.js';
  import type { ThemePreference } from '../format/view-helpers.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface HeaderProps {
    readonly connection: ConnectionPhase;
    readonly onHome: () => void;
    readonly onReview: () => void;
    readonly onInbox: () => void;
    readonly reviewAvailable: boolean;
    readonly theme: ThemePreference;
    readonly onThemeChange: (theme: ThemePreference) => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Button from '../primitives/button/button.svelte';
  import StatusPill from './status-pill.svelte';
  import ThemeControl from './theme-control.svelte';

  import './header.css';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    connection,
    onHome,
    onReview,
    onInbox,
    reviewAvailable,
    theme,
    onThemeChange,
  }: HeaderProps = $props();
</script>

<header class="topbar">
  <!-- @ds surface: chrome-button — wordmark + nav react-aria Buttons. -->
  <!-- @ds guardrail: react-aria Button wiring (press + aria-label) — presentation only in CSS. -->
  <Button class="wordmark" onclick={onHome} aria-label="Pi Remote home">
    <span class="pi-mark" aria-hidden="true">
      π
    </span>
    <span class="wordmark-copy">
      <strong>Pi Remote</strong>
      <small>Private relay</small>
    </span>
  </Button>
  <div class="topbar-actions">
    <!-- @ds slot: nav-inbox -->
    {#if reviewAvailable}
      <Button class="nav-button" onclick={onInbox}>
        Inbox
      </Button>
    {/if}
    <!-- @ds slot: nav-review -->
    {#if reviewAvailable}
      <Button class="nav-button" onclick={onReview}>
        Review
      </Button>
    {/if}
    <ThemeControl value={theme} onChange={onThemeChange} />
    <StatusPill phase={connection} />
  </div>
</header>

<!-- @ds surface: topbar — global chrome header for the non-session surfaces. Decomposed into this co-located CSS file;
     topbar, pi-mark, wordmark-copy and topbar-actions are owned solely by this component so they move
     with it. .wordmark and .nav-button are on the Button primitive so they use :global. The grouped
     .nav-button, .theme-option, .back-button base + hover rules, the grouped .wordmark-copy, .status-pill
     @media (max-width: 52rem) rule, and the grouped .topbar, .session-header safe-gutter rule stay GLOBAL
     in app.css (unchanged) so their byte-for-byte structure is preserved. Values unchanged. -->
