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

  import './collapsed-evidence.css';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blockId, summary, children }: CollapsedEvidenceProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const disclosure = createTranscriptDisclosureBinding(() => blockId);

  // The wrapper does not forward trigger class/aria, and Bits does not emit react-aria's data-expanded/data-hovered.
  // The button therefore sets both attributes explicitly from its state.
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

<!-- The trigger names what it reveals (e.g. "Tool call · grep") instead of a generic "Show",
     so routine evidence reads as a quiet, truthful disclosure beside the assistant's prose. -->
<!-- @ds surface: evidence-disclosure — routine evidence Disclosure trigger + panel. -->
<Collapsible bind:open={disclosure.open}>
  {#snippet trigger()}
    <!-- @ds guardrail: react-aria Disclosure wiring (expansion + trigger slot + aria) — not designer-editable. -->
    <span class="evidence-chevron" aria-hidden="true" {@attach attachEvidenceTrigger}>›</span>
    <span class="evidence-summary">{summary}</span>
  {/snippet}
  {@render children()}
</Collapsible>

<!-- @ds surface: evidence-disclosure — routine evidence Disclosure trigger + panel. Decomposed into this co-located CSS file;
     evidence-trigger is a Collapsible.Trigger primitive so its class and react-aria/runtime data-attributes use
     :global so Svelte scoping cannot drop them. evidence-chevron/evidence-summary are shared with
     NormalizedActivityGroup and stay global here. Values unchanged. -->
