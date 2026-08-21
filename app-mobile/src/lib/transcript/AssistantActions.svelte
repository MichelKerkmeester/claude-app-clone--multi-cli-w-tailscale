<script module lang="ts">
  /** Under-answer actions. Capability-gated and honest: Copy renders only where the Clipboard
   * API exists, and Share only where Web Share does — no decorative or disabled fake actions. */
  export interface AssistantActionsProps {
    readonly text: string;
  }
</script>

<script lang="ts">
  let { text }: AssistantActionsProps = $props();

  let copied = $state(false);

  const canCopy =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
  const canShare =
    typeof navigator !== 'undefined' && typeof (navigator as Navigator).share === 'function';
</script>

<!-- @ds surface: turn-actions — Copy / Share answer actions + inline glyphs. -->
{#if canCopy || canShare}
  <div class="turn-actions">
    {#if canCopy}
      <!-- @ds guardrail: aria-label + clipboard handler — not designer-editable. -->
      <button
        type="button"
        class="turn-action"
        aria-label={copied ? 'Answer copied' : 'Copy answer'}
        onclick={() => {
          void navigator.clipboard
            .writeText(text)
            .then(() => {
              copied = true;
              window.setTimeout(() => (copied = false), 1500);
            })
            .catch(() => undefined);
        }}
      >
        <!-- @ds slot: copy-glyph — inline clipboard glyph; strokes inherit currentColor. -->
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
      <!-- @ds guardrail: aria-label + share handler — not designer-editable. -->
      <button
        type="button"
        class="turn-action"
        aria-label="Share answer"
        onclick={() => {
          void (navigator as Navigator).share({ text }).catch(() => undefined);
        }}
      >
        <!-- @ds slot: share-glyph — inline share glyph; strokes inherit currentColor. -->
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
  </div>
{/if}

<!-- @ds surface: turn-actions — Copy / Share answer actions + inline glyphs. Decomposed from
     style.css; turn-actions / turn-action and their hover/focus-visible states are owned solely
     by this component so they move with it. Native div/button elements stay scoped. Values
     unchanged. -->
<style>
  /* Under-answer action row — quiet monochrome, like the Claude app. */
  /* @ds surface: turn-actions — Copy / Share answer actions + inline glyphs. */
  .turn-actions {
    display: flex;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  /* @ds slot: action — a Copy / Share answer button. */
  .turn-action {
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

  /* @ds state: hover */
  .turn-action:hover {
    background: var(--surface-muted);
    color: var(--ink-secondary);
  }

  /* @ds state: focus-visible */
  .turn-action:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  /* @ds end surface: turn-actions */
</style>
