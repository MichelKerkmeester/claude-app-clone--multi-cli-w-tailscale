<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RICH BLOCK FRAME
  // ───────────────────────────────────────────────────────────────────

  import type { Snippet } from 'svelte';
  import type { RedactionMetadata } from '@pi-remote/pi-rpc-protocol';
  import RedactionBadge from './redaction-badge.svelte';

  interface Props {
    title: string;
    eyebrow?: string;
    metadata?: readonly string[];
    status?: string;
    redaction?: RedactionMetadata | null;
    actions?: Snippet;
    children: Snippet;
    class?: string;
  }

  let {
    title,
    eyebrow,
    metadata = [],
    status,
    redaction = null,
    actions,
    children,
    class: className = '',
  }: Props = $props();
</script>

<!-- @ds surface: rich-block-frame — shared chrome for every rich card: header
     (eyebrow · title · metadata · status · redaction), content column, and a
     footer action row. The matching presentation lives in the scoped <style>
     below. A designer may edit markup between the @ds slot seams below and
     nothing else. -->
<article class={`rich-block-frame${className.length > 0 ? ` ${className}` : ''}`}>
  <!-- @ds slot: header — eyebrow · title · metadata against status · redaction. -->
  <header class="rich-block-header">
    <!-- @ds slot: heading — eyebrow + title + metadata column. -->
    <div class="rich-block-heading">
      {#if eyebrow !== undefined}<p class="rich-block-eyebrow">{eyebrow}</p>{/if}
      <h3>{title}</h3>
      <!-- @ds slot: metadata — factual chips; the map wiring is guardrailed. -->
      {#if metadata.length > 0}
        <div class="rich-block-metadata">
          <!-- @ds guardrail: do-not-edit — Metadata is derived data mapped to chips; edit the list only while it remains a bounded read-out. -->
          {#each metadata as value (value)}<span>{value}</span>{/each}
        </div>
      {/if}
    </div>
    <!-- @ds slot: status — lifecycle caption + redaction badge. -->
    <div class="rich-block-status">
      {#if status !== undefined}<span>{status}</span>{/if}
      <!-- @ds guardrail: do-not-edit — RedactionBadge marks already-redacted, read-only content; never remove it from the frame. -->
      <RedactionBadge {redaction} />
    </div>
  </header>
  <!-- @ds slot: content — the per-card preview region. -->
  <div class="rich-block-content">{@render children()}</div>
  <!-- @ds slot: actions — footer row of Copy / Open unit actions. -->
  {#if actions !== undefined}<footer class="rich-block-actions">{@render actions()}</footer>{/if}
</article>

<style>
  /* @ds edit: layout — card geometry, padding, radius, shadow, frame width. */
  .rich-block-frame {
    min-inline-size: 0;
    inline-size: 100%;
    margin-block: var(--space-3);
    padding: var(--space-4);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  /* @ds slot: header — title/eyebrow/metadata versus status/redaction row. */
  /* @ds edit: layout — header gap, alignment, space-between rhythm. */
  .rich-block-header {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    justify-content: space-between;
    min-inline-size: 0;
    margin-block-end: var(--space-3);
  }

  /* @ds slot: heading — eyebrow + title + metadata column. */
  .rich-block-heading {
    min-inline-size: 0;
  }

  /* @ds slot: title — card title (h3). */
  .rich-block-heading h3 {
    margin: 0;
    color: var(--ink);
    font-weight: 600;
    overflow-wrap: anywhere;
    font-size: 1rem;
  }

  /* @ds slot: label — eyebrow kicker above the card title. */
  .rich-block-eyebrow {
    margin: 0 0 var(--space-1);
    color: var(--ink-muted);
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* @ds slot: metadata · status · actions — shared flex row rhythm. */
  .rich-block-metadata,
  .rich-block-status,
  .rich-block-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  /* @ds slot: metadata — quiet factual chips (language, call, lines, labels). */
  .rich-block-metadata {
    margin-block-start: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* @ds slot: metadata — inter-chip bullet separator. */
  .rich-block-metadata span + span::before {
    margin-inline-end: var(--space-2);
    content: '·';
  }

  /* @ds slot: status — lifecycle caption and redaction badge. */
  .rich-block-status {
    flex: 0 1 auto;
    justify-content: flex-end;
    color: var(--ink-muted);
    font-size: 0.8125rem;
    text-align: end;
  }

  /* @ds slot: content — the card body holding the per-card preview regions. */
  .rich-block-content {
    min-inline-size: 0;
  }

  /* @ds slot: actions — footer row of Copy/Open unit actions. */
  /* @ds state: open-handoff — the Open full screen action is a handoff into the
     existing artifacts viewer; it adds no fetch, endpoint, ticket, download, or
     host-file read. Behaviour is guardrailed in the cards' logic. */
  .rich-block-actions {
    margin-block-start: var(--space-4);
  }

  /* @ds edit: layout — narrow reflow of the card at <=27rem: padding, header
     stacking, and left-aligned status. */
  @media (max-width: 27rem) {
    .rich-block-frame {
      padding: var(--space-3);
    }

    .rich-block-header {
      display: block;
    }

    .rich-block-status {
      justify-content: flex-start;
      margin-block-start: var(--space-2);
      text-align: start;
    }
  }
</style>
