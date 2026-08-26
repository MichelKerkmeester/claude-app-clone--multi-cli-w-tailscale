<script module lang="ts">
  // This module holds the shared Assistant Actions types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ASSISTANT ACTIONS
  // ───────────────────────────────────────────────────────────────────

  /** Copy/Share only when the platform APIs exist — no fake disabled actions. */
  export interface AssistantActionsProps {
    readonly text: string;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { useCopyFeedback } from '../rich-content/use-copy-feedback.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { text }: AssistantActionsProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const feedback = useCopyFeedback();
  const canShare =
    typeof navigator !== 'undefined' && typeof (navigator as Navigator).share === 'function';
  const copied = $derived(feedback.copiedUnit === 'answer' && !feedback.copyFailed);
</script>

<!-- section: turn actions -->
<!-- This surface: turn--actions — Copy / Share answer actions + inline glyphs. -->
{#if feedback.canCopy || canShare}
  <div class="turn--actions">
    {#if feedback.canCopy}
      <!-- Do not edit — aria-label + clipboard handler — not designer-editable. -->
      <button
        type="button"
        class="turn--action"
        class:is-copied={copied}
        use:hover
        use:press
        use:focusVisible
        aria-label={copied ? 'Answer copied' : 'Copy answer'}
        onclick={() => feedback.copy('answer', text)}
      >
        <!-- This slot: copy-glyph — inline clipboard glyph; strokes inherit currentColor. -->
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />
          <path
            d="M6 15V6a2 2 0 0 1 2-2h9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    {/if}
    {#if canShare}
      <!-- Do not edit — aria-label + share handler — not designer-editable. -->
      <button
        type="button"
        class="turn--action"
        use:hover
        use:press
        use:focusVisible
        aria-label="Share answer"
        onclick={() => {
          void (navigator as Navigator).share({ text }).catch(() => undefined);
        }}
      >
        <!-- This slot: share-glyph — inline share glyph; strokes inherit currentColor. -->
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path
            d="M12 15V4M12 4l-4 4M12 4l4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Share</span>
      </button>
    {/if}
    {#if feedback.canCopy}
      <span class="turn--copy-status sr-only" role="status" aria-live="polite">{feedback.announcement}</span>
    {/if}
  </div>
{/if}

<style>
  /* Quiet under-answer action row. */
  /* This surface: turn--actions — Copy / Share answer actions + inline glyphs. */
  .turn--actions {
    display: flex;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  /* This slot: action — a Copy / Share answer button. */
  .turn--action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2rem;
    padding: 0.3rem 0.6rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-weight: 550;
    cursor: pointer;
  }

  /* This state: hover via the pointer-aware action, never native :hover. */
  .turn--action:global([data-hovered]) {
    background: var(--surface-muted);
    color: var(--ink-secondary);
  }

  /* This state: copied — tint only; width stays put so the row does not shift. */
  .turn--action.is-copied {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* This state: focus-visible */
  .turn--action:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
</style>
