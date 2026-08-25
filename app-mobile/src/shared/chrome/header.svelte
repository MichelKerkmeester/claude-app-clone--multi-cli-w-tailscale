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
    <span class="wordmark--copy">
      <strong>Pi Remote</strong>
      <small>Private relay</small>
    </span>
  </Button>
  <div class="topbar--actions">
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

<!-- @ds surface: topbar — global chrome header for the non-session surfaces. Decomposed into this scoped block;
     topbar, pi-mark, wordmark--copy and topbar--actions are owned solely by this component so they move
     with it. .wordmark and .nav-button are on the Button primitive so they use :global. The grouped
     .nav-button, .theme--option, .back-button base + hover rules, the grouped .wordmark--copy, .status--pill
     @media (max-width: 52rem) rule, and the grouped .topbar, .session-header safe-gutter rule stay GLOBAL
     in app.css (unchanged) so their byte-for-byte structure is preserved. Values unchanged. -->
<style>
  /* @ds surface: topbar — global chrome header for the non-session surfaces. */
  /* @ds edit: layout — sticky-bar geometry + safe top gutter. */
  .topbar {
    position: sticky;
    z-index: 20;
    top: 0;
    display: flex;
    min-height: 4.25rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: max(var(--space-2), env(safe-area-inset-top)) var(--page-gutter) var(--space-2);
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklch, var(--canvas) 91%, transparent);
    backdrop-filter: blur(12px);
  }

  /* @ds slot: wordmark — Pi Remote wordmark block. */
  :global(.wordmark) {
    display: flex;
    min-width: 2.75rem;
    min-height: 2.75rem;
    align-items: center;
    gap: var(--space-3);
    padding: 0;
    border: 0;
    background: transparent;
    text-align: start;
    cursor: pointer;
    transition: opacity var(--duration-fast) ease;
  }

  :global(.wordmark[data-hovered]) {
    opacity: 0.72;
  }

  .pi-mark {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 50%;
    background: var(--ink);
    color: var(--ink-inverse);
    font-size: 1.05rem;
    font-weight: 700;
  }

  .wordmark--copy {
    display: grid;
    gap: 0.05rem;
  }

  .wordmark--copy strong {
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .wordmark--copy small {
    color: var(--ink-muted);
    font-size: 0.67rem;
    font-weight: 550;
  }

  /* @ds slot: nav — Inbox · Review actions; theme-toggle and status slots are shared surfaces below. */
  .topbar--actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* @ds end surface: topbar */

  @media (max-width: 52rem) {
    .topbar {
      align-items: flex-start;
    }
  }

  @media (max-width: 39rem) {
    .topbar {
      gap: var(--space-2);
      padding-inline: var(--space-3);
    }

    .topbar--actions {
      gap: var(--space-1);
    }

    :global(.nav-button) {
      padding-inline: var(--space-2);
      font-size: 0.72rem;
    }
  }
</style>
