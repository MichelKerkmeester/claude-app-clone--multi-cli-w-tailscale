<script module lang="ts">
  // This module holds the shared Transcript Find Bar types.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TRANSCRIPT FIND BAR
  // ───────────────────────────────────────────────────────────────────

  import type { FindCursor, SearchSnippet } from './transcript-find-index.js';

  export interface TranscriptFindBarProps {
    readonly query: string;
    readonly cursor: FindCursor;
    readonly snippet: SearchSnippet | null;
    readonly onQueryChange: (value: string) => void;
    readonly onNext: () => void;
    readonly onPrev: () => void;
    readonly onClose: () => void;
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

  let { query, cursor, snippet, onQueryChange, onNext, onPrev, onClose }: TranscriptFindBarProps =
    $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onFindKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onPrev();
      else onNext();
    }
  }
</script>

<!-- section: find bar chrome -->
<div class="transcript-find" role="search">
  <label class="transcript-find--label" for="transcript-find-input">Find in transcript</label>
  <input
    id="transcript-find-input"
    class="transcript-find--input"
    type="search"
    value={query}
    autocomplete="off"
    spellcheck="false"
    aria-keyshortcuts="Enter Shift+Enter Escape"
    oninput={(event) => onQueryChange(event.currentTarget.value)}
    onkeydown={onFindKeydown}
  />
  <p class="transcript-find--count" role="status" aria-live="polite">
    {cursor.matchCount === 0 ? '0/0' : `${cursor.matchIndex}/${cursor.matchCount}`}
  </p>
  <button
    type="button"
    class="transcript-find--step"
    use:hover
    use:press
    use:focusVisible
    aria-label="Previous match"
    disabled={cursor.matchCount === 0}
    onclick={onPrev}
  >
    Prev
  </button>
  <button
    type="button"
    class="transcript-find--step"
    use:hover
    use:press
    use:focusVisible
    aria-label="Next match"
    disabled={cursor.matchCount === 0}
    onclick={onNext}
  >
    Next
  </button>
  <button
    type="button"
    class="transcript-find--close"
    use:hover
    use:press
    use:focusVisible
    aria-label="Close find"
    onclick={onClose}
  >
    Close
  </button>
  {#if snippet !== null && cursor.matchCount > 0}
    <p class="transcript-find--snippet">
      <span class="transcript-find--role">{snippet.role}</span>
      <span>{snippet.text}</span>
    </p>
  {/if}
</div>

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. FIND BAR
  ─────────────────────────────────────────────────────────────────── */
  /* Snapshot-scoped find chrome; wraparound lives in the cursor, not the DOM. */
  .transcript-find {
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
  }

  .transcript-find--label {
    grid-column: 1 / -1;
    color: var(--ink-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .transcript-find--input {
    min-block-size: 44px;
    min-inline-size: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }

  .transcript-find--count {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .transcript-find--step,
  .transcript-find--close {
    min-inline-size: 44px;
    min-block-size: 44px;
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.8rem;
    font-weight: 550;
    cursor: pointer;
  }

  .transcript-find--step:global([data-hovered]),
  .transcript-find--close:global([data-hovered]) {
    background: var(--surface-muted);
  }

  .transcript-find--step:global([data-focus-visible]),
  .transcript-find--close:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .transcript-find--step:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .transcript-find--snippet {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--ink-secondary);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }

  .transcript-find--role {
    margin-inline-end: var(--space-2);
    color: var(--ink-muted);
    font-weight: 700;
    text-transform: lowercase;
  }
</style>
