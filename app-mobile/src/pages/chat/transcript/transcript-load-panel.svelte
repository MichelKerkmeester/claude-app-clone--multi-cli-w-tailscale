<script module lang="ts">
  // This module holds the shared Transcript Load Panel types.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TRANSCRIPT LOAD PANEL
  // ───────────────────────────────────────────────────────────────────

  import type { TranscriptLoadView } from './transcript-load-state.js';

  export interface TranscriptLoadPanelProps {
    readonly view: TranscriptLoadView;
    readonly onRetry?: () => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { view, onRetry }: TranscriptLoadPanelProps = $props();
</script>

<!-- section: named load state -->
<div
  class="transcript-load"
  data-load-kind={view.kind}
  role="status"
  aria-live="polite"
>
  <h3 class="transcript-load--title">{view.title}</h3>
  <p class="transcript-load--detail">{view.detail}</p>
  {#if view.retryable && onRetry !== undefined}
    <button
      type="button"
      class="transcript-load--retry"
      use:hover
      use:press
      use:focusVisible
      onclick={onRetry}
    >
      Retry
    </button>
  {/if}
</div>

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. LOAD PANEL
  ─────────────────────────────────────────────────────────────────── */
  /* Named empty/error states so an unreadable transcript cannot look like a new chat. */
  .transcript-load {
    padding: clamp(3rem, 8vw, 6rem) var(--space-4);
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-lg);
    color: var(--ink-muted);
    text-align: center;
  }

  .transcript-load--title {
    margin: 0 0 var(--space-2);
    color: var(--ink);
    font-size: 1.05rem;
  }

  .transcript-load--detail {
    margin: 0;
    font-size: 0.9rem;
  }

  .transcript-load--retry {
    min-inline-size: 44px;
    min-block-size: 44px;
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-raised);
    color: var(--ink);
    font-weight: 550;
    cursor: pointer;
  }

  .transcript-load--retry:global([data-hovered]) {
    background: var(--surface-muted);
  }

  .transcript-load--retry:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
</style>
