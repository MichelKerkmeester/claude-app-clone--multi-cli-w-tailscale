<script module lang="ts">
  import type { NormalizedActivityBlock } from '../rich-content/normalize-transcript-blocks.js';

  export interface NormalizedActivityGroupProps {
    readonly blocks: readonly NormalizedActivityBlock[];
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Collapsible from '$shared/primitives/disclosure/collapsible.svelte';
  import { hover } from '$shared/primitives/a11y/interactions.js';
  import { normalizedActivitySummary } from './transcript-helpers.js';
  import RichContentRouter from '../rich-content/rich-content-router.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blocks }: NormalizedActivityGroupProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // defaultExpanded={false} → Collapsible starts closed (open defaults to false on the primitive).
  let open = $state(false);

  // Collapsible.Trigger renders the trigger snippet inside a button; the wrapper does not forward
  // trigger class/aria, and Bits does not emit react-aria's data-expanded/data-hovered, so they
  // are set explicitly on the button (data-expanded reactively from `open`, data-hovered via hover).
  let triggerButton = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
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

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const button = triggerButton;
    if (button === null) return;
    if (open) button.setAttribute('data-expanded', 'true');
    else button.removeAttribute('data-expanded');
  });
</script>

<!-- @ds surface: activity-group — grouped bare evidence surface. -->
<!-- @ds surface: evidence-disclosure — grouped activity disclosure. -->
<div class="activity-group">
  <!-- @ds guardrail: react-aria Disclosure wiring — not designer-editable. -->
  <Collapsible bind:open>
    {#snippet trigger()}
      <span class="evidence-chevron" aria-hidden="true" {@attach attachEvidenceTrigger}>›</span>
      <span class="evidence-summary">{normalizedActivitySummary(blocks)}</span>
    {/snippet}
    <div class="activity-stack">
      {#each blocks as block (block.blockId)}
        <RichContentRouter {block} />
      {/each}
    </div>
  </Collapsible>
</div>

<!-- @ds surface: activity-group — grouped bare evidence surface. Decomposed into this scoped block;
     activity-group/activity-stack are owned solely by this component so they move with it (scoped).
     evidence-trigger/chevron/summary are shared with CollapsedEvidence and stay :global there
     (CollapsedEvidence.svelte's scoped style block); they are not redefined here to avoid duplicate global CSS.
     Values unchanged. -->
<style>
  /* @ds surface: activity-group — grouped bare evidence blocks in one quiet disclosure. */
  .activity-group {
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  /* @ds slot: panel-body — the DisclosurePanel content stack of an evidence disclosure. */
  .activity-stack {
    display: grid;
    gap: var(--space-2);
    padding: 0 var(--space-3) var(--space-3);
  }
</style>
