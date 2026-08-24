<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RICH BLOCK FRAME
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { Snippet } from 'svelte';
  import type { RedactionMetadata } from '@pi-remote/pi-rpc-protocol';
  import RedactionBadge from './redaction-badge.svelte';

  import './rich-block-frame.css';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

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
