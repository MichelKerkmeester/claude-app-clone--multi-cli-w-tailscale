<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface CollapsedEvidenceProps {
    readonly blockId?: string;
    readonly summary: string;
    readonly children: Snippet;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Collapsible from '$shared/primitives/disclosure/collapsible.svelte';
  import { hover } from '$shared/primitives/a11y/interactions.js';
  import { createTranscriptDisclosureBinding } from '$shared/state/transcript-disclosure.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blockId, summary, children }: CollapsedEvidenceProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const disclosure = createTranscriptDisclosureBinding(() => blockId);

  // Bits does not emit data-expanded/data-hovered; set both on the trigger explicitly.
  let triggerButton = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const button = triggerButton;
    if (button === null) return;
    if (disclosure.open) button.setAttribute('data-expanded', 'true');
    else button.removeAttribute('data-expanded');
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function attachEvidenceTrigger(node: HTMLElement): (() => void) | void {
    const button = node.parentElement;
    if (!(button instanceof HTMLButtonElement)) return;
    button.classList.add('evidence-trigger');
    triggerButton = button;
    const hoverAct = hover(button);
    return () => {
      hoverAct?.destroy?.();
      button.classList.remove('evidence-trigger');
      if (triggerButton === button) triggerButton = null;
    };
  }
</script>

<!-- Self-describing trigger (e.g. "Tool call · grep"), not a generic "Show". -->
<!-- @ds surface: evidence-disclosure — routine evidence Disclosure trigger + panel. -->
<Collapsible bind:open={disclosure.open}>
  {#snippet trigger()}
    <!-- @ds guardrail: react-aria Disclosure wiring (expansion + trigger slot + aria) — not designer-editable. -->
    <span class="evidence-chevron" aria-hidden="true" {@attach attachEvidenceTrigger}>›</span>
    <span class="evidence-summary">{summary}</span>
  {/snippet}
  {@render children()}
</Collapsible>

<!-- @ds surface: evidence-disclosure — routine evidence Disclosure trigger + panel. Decomposed into this scoped block;
     evidence-trigger is a Collapsible.Trigger primitive so its class and react-aria/runtime data-attributes use
     :global so Svelte scoping cannot drop them. evidence-chevron/evidence-summary are shared with
     NormalizedActivityGroup and stay global here. Values unchanged. -->
<style>
  /* Quiet self-describing disclosure beside prose. */
  /* @ds surface: evidence-disclosure — routine evidence Disclosure trigger + panel. */
  :global(.evidence-trigger) {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 2.25rem;
    padding: var(--space-1) var(--space-2);
    border: 0;
    background: transparent;
    color: var(--ink-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  /* @ds state: hover */
  :global(.evidence-trigger[data-hovered] .evidence-summary) {
    color: var(--ink-secondary);
  }

  /* @ds slot: chevron */
  :global(.evidence-chevron) {
    display: inline-block;
    font-size: 1rem;
    line-height: 1;
    transition: transform var(--duration-state) var(--ease-out);
  }

  /* @ds state: expanded */
  :global(.evidence-trigger[data-expanded] .evidence-chevron) {
    transform: rotate(90deg);
  }
  /* @ds end surface: evidence-disclosure */
</style>
