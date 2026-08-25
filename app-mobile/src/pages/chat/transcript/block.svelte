<script module lang="ts">
  import type { DisplayTranscriptBlock } from '$shared/state/state.js';
  import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';

  export interface BlockProps {
    readonly block: DisplayTranscriptBlock;
    readonly bare?: boolean;
    readonly sessionId: string;
    readonly canAnswer?: boolean;
    readonly askQuestionPrincipal?: string | undefined;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import ArtifactCard from '../artifacts/card-artifact.svelte';
  import InboundImageBlockView from '../artifacts/inbound-image-block-view.svelte';
  import AskQuestionCard from '../features/ask-question/card-ask-question.svelte';
  import { formatNumber, formatCost, formatTime } from '$shared/format/format.js';
  import CollapsedEvidence from './collapsed-evidence.svelte';
  import FilePreviewCard from './card-file-preview.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    block,
    bare = false,
    sessionId,
    canAnswer = true,
    askQuestionPrincipal,
  }: BlockProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: transcript-block — one message block; each kind is its own state seam below.
  // @ds guardrail: the kind switch, collapsibility, role and header decisions are presentation logic that must stay in lockstep with the block model; not designer-editable.
  // Routine evidence collapses; text, plan, diffs, and tool errors stay expanded.
  const blockDisplay = $derived.by(() => {
    switch (block.kind) {
      // @ds state: text — user bubble vs assistant serif prose via the role class.
      case 'text':
        return { label: block.role === 'user' ? 'You' : 'Assistant', collapsible: false };
      case 'text_artifact':
        return { label: `Text artifact · ${block.label}`, collapsible: false };
      // @ds state: thinking
      case 'thinking':
        return { label: 'Thinking summary', collapsible: true };
      // @ds state: plan
      // @ds surface: plan-todo — the plan-block ✓/○ checklist surface; item states pending (○) · done (✓).
      // @ds guardrail: the block.items and each item's `done` flag come from the plan block model; done-state derivation and plan-mode gating live there and in the reducer, never editable here.
      case 'plan':
        return { label: 'Plan / todo', collapsible: false };
      // @ds state: tool_call
      case 'tool_call':
        return { label: `Tool call · ${block.toolName}`, collapsible: true };
      // @ds state: tool_result (+ error)
      case 'tool_result':
        return {
          label: `${block.isError ? 'Tool error' : 'Tool result'} · ${block.toolName}`,
          collapsible: !block.isError,
        };
      // @ds state: file_diff — rich-content card seam.
      case 'file_diff':
        return { label: 'File diff', collapsible: false };
      // @ds state: file_preview
      case 'file_preview':
        return { label: 'File preview', collapsible: false };
      // @ds state: usage
      case 'usage':
        return { label: 'Usage', collapsible: true };
      case 'attachment':
        return { label: 'Photo attachment', collapsible: false };
      case 'inbound_image':
        return { label: block.displayName, collapsible: false };
      case 'ask-question':
        return { label: 'Question', collapsible: false };
      // @ds state: unknown
      case 'unknown':
        return { label: 'Unsupported block', collapsible: false };
    }
  });

  const roleClass = $derived(block.kind === 'text' ? ` block-role-${block.role ?? 'assistant'}` : '');
  // Text uses role/typography; evidence uses its trigger; bare blocks show label inline; others get header.
  const showHeader = $derived(
    block.kind !== 'file_diff' &&
      block.kind !== 'file_preview' &&
      block.kind !== 'inbound_image' &&
      block.kind !== 'ask-question' &&
      (bare ? block.kind !== 'text' : block.kind !== 'text' && !blockDisplay.collapsible),
  );
  const renderAsDisclosure = $derived(blockDisplay.collapsible && !bare);
</script>

{#snippet blockContent()}
  {#if block.kind === 'text'}
    <p class="block-copy">{block.text}</p>
  {:else if block.kind === 'text_artifact'}
    <pre class="block-copy">{block.source}</pre>
  {:else if block.kind === 'thinking'}
    <p class="block-copy quiet-copy">{block.summary}</p>
  {:else if block.kind === 'plan'}
    <!-- @ds slot: checklist — the plan-list row grid; each row exposes a pending/done state below. -->
    <ul class="plan-list">
      {#each block.items as item, index (`${block.id}-${index}`)}
        <!-- @ds state: pending (○) · done (✓) — the `done` class selects the item state; the -->
        <!--   The inline glyph and text below are rendered by this branch. -->
        <li class={item.done ? 'done' : ''}>
          <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
          {item.text}
        </li>
      {/each}
    </ul>
  {:else if block.kind === 'tool_call'}
    <pre>{block.inputSummary}</pre>
  {:else if block.kind === 'tool_result'}
    <pre class={block.isError ? 'error-output' : ''}>{block.output}</pre>
  {:else if block.kind === 'file_diff'}
    <ArtifactCard {block} />
  {:else if block.kind === 'file_preview'}
    <FilePreviewCard {block} {sessionId} />
  {:else if block.kind === 'usage'}
    <div class="usage-grid">
      <span>
        <strong>{formatNumber(block.inputTokens)}</strong> input
      </span>
      <span>
        <strong>{formatNumber(block.outputTokens)}</strong> output
      </span>
      <span>
        <strong>{formatCost(block.cost)}</strong> cost
      </span>
    </div>
  {:else if block.kind === 'attachment'}
    <div class="redacted-attachment-card" role="status">
      <span class="redacted-attachment-glyph" aria-hidden="true">
        ◇
      </span>
      <div>
        <strong>Preview not retained</strong>
        <p>
          Photo {block.ordinal} was delivered without keeping image content in this transcript.
        </p>
      </div>
      <span class="redacted-attachment-status">
        {block.status === 'delivered' ? 'Delivered' : 'Delivery unknown'}
      </span>
    </div>
  {:else if block.kind === 'inbound_image'}
    <InboundImageBlockView {block} {sessionId} />
  {:else if block.kind === 'ask-question'}
    <AskQuestionCard
      block={block as AskQuestionTranscriptMeta}
      {sessionId}
      {canAnswer}
      principal={askQuestionPrincipal}
    />
  {:else if block.kind === 'unknown'}
    <p class="block-copy quiet-copy" data-unsupported-kind={block.originalKind}>
      A redacted “{block.originalKind}” block cannot be displayed by this client.
    </p>
  {/if}
{/snippet}

<article class={`transcript-block block-${block.kind}${roleClass}${bare ? ' block-bare' : ''}`}>
  <!-- @ds slot: header — block label + timestamp. -->
  {#if showHeader}
    <header>
      <span>{blockDisplay.label}</span>
      <time datetime={block.occurredAt}>{formatTime(block.occurredAt)}</time>
    </header>
  {/if}
  {#if renderAsDisclosure}
    <CollapsedEvidence blockId={block.id} summary={blockDisplay.label}>
      {@render blockContent()}
    </CollapsedEvidence>
  {:else}
    {@render blockContent()}
  {/if}
  <!-- @ds slot: rich-content-cards — a documented seam where the rich-content card group -->
  <!--   (code, command output, text artifacts) slots onto a block; not rendered here yet. -->
</article>

<!-- @ds surface: transcript-block — one message block; each kind is a state seam below.
     Decomposed into this scoped block; the block-owned article/header/copy-grid/plan-list/usage/
     redacted-attachment selectors move scoped here. block-copy, quiet-copy, and the solo
     block-role-* rules stay global (shared with RichContentRouter and InboundImageBlockView).
     Values unchanged. -->
<style>
  /* Ask-question answers stay in the transcript; the host remains the only authority. */
  .block-ask-question {
    overflow: visible;
    border: 0;
    background: transparent;
  }

  .redacted-attachment-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: center;
    margin-block: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
  }

  .redacted-attachment-glyph {
    display: grid;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    place-items: center;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 1.2rem;
  }

  .redacted-attachment-card strong {
    color: var(--ink);
    font-size: 0.9rem;
  }

  .redacted-attachment-card p {
    margin: 2px 0 0;
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .redacted-attachment-status {
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 650;
    white-space: nowrap;
  }

  @media (max-width: 40rem) {
    .redacted-attachment-card {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .redacted-attachment-status {
      grid-column: 2;
    }
  }

  /* @ds surface: transcript-block — one message block; each kind is a state seam below. */
  .transcript-block {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  /* @ds state: text */
  .block-text {
    border-color: color-mix(in oklch, var(--accent) 30%, var(--line));
    background: var(--surface-raised);
  }

  .block-text:has(header span:first-child) {
    scroll-margin-block: 6rem;
  }

  /* @ds slot: header — block label + timestamp row. */
  .transcript-block > header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-3);
    padding-inline: var(--space-4);
    border-bottom: 1px solid var(--line);
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 680;
  }

  /* @ds slot: header-time — mono timestamp. */
  .transcript-block > header time {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    font-variant-numeric: tabular-nums;
  }

  .block-text > header span,
  .block-plan > header span {
    color: var(--accent-ink);
  }

  /* @ds state: text-user — compact, trailing-aligned bubble. */
  .transcript-block.block-role-user {
    width: fit-content;
    max-width: min(82%, 46ch);
    margin-inline-start: auto;
    border-color: var(--line);
    border-radius: 1.15rem;
    background: var(--surface-muted);
  }

  /* @ds state: text-assistant — borderless serif prose reply. */
  .transcript-block.block-role-assistant {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  /* @ds surface: plan-todo — the plan-block ✓/○ checklist. States: pending (○) · done (✓). */
  /* @ds state: plan — checklist items. */
  /* @ds guardrail: the item `done` state comes from the plan block model; done derivation and
     plan-mode gating live in the model/reducer, never in a style edit. */
  .plan-list {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: var(--space-4) var(--space-6) var(--space-6);
    list-style: none;
  }

  /* @ds state: pending — an open (○) item; the glyph renders in `li > span`. */
  .plan-list li {
    display: grid;
    grid-template-columns: 1.4rem 1fr;
    align-items: start;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  /* @ds slot: glyph — the ✓/○ marker. */
  .plan-list li > span {
    color: var(--accent-ink);
    font-weight: 700;
  }

  /* @ds state: done — a completed (✓) item. */
  .plan-list .done {
    color: var(--ink-muted);
  }

  /* @ds state: done · glyph — the ✓ marker switches to success. */
  .plan-list .done > span {
    color: var(--success);
  }

  /* @ds end surface: plan-todo */

  /* @ds state: tool_call · tool_result — monospace output (danger variant below). */
  .transcript-block pre {
    max-height: 26rem;
    margin: 0;
    padding: var(--space-4) var(--space-6);
    overflow: auto;
    background: var(--surface-code);
    color: oklch(0.9 0.012 255);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* @ds state: tool_result+error — danger output. */
  .transcript-block .error-output {
    color: oklch(0.82 0.1 25);
  }

  /* ── Read-only artifact card and viewer ──────────────────────────────── */
  /* @ds state: file_diff — diff card (the rich-content card seam slots here). */
  .transcript-block.block-file_diff {
    overflow: visible;
    border: 0;
    background: transparent;
  }

  /* @ds state: usage — input/output/cost grid. */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .usage-grid span {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-4);
    border-inline-end: 1px solid var(--line);
    color: var(--ink-muted);
    font-size: 0.67rem;
    font-weight: 620;
  }

  .usage-grid span:last-child {
    border-inline-end: 0;
  }

  .usage-grid strong {
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 0.98rem;
    font-variant-numeric: tabular-nums;
  }

  .transcript-block.block-bare {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .block-bare > header {
    padding-inline: 0;
  }

  @media (max-width: 39rem) {
    .usage-grid {
      grid-template-columns: 1fr;
    }

    .usage-grid span {
      grid-template-columns: 1fr auto;
      border-inline-end: 0;
      border-bottom: 1px solid var(--line);
    }

    .usage-grid span:last-child {
      border-bottom: 0;
    }
  }
</style>
