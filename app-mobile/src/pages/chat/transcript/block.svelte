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

  import './block.css';

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
  // Routine evidence collapses to a recoverable disclosure; high-signal blocks
  // (text, plan, diffs, and tool errors) stay expanded and prominent.
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
  // Text turns imply role by placement and typography, while collapsible evidence owns its labelled trigger.
  // The label/timestamp header is reserved for promoted standalone blocks.
  // When `bare`, the block sits inside an Activity disclosure, so it shows its label directly.
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
     Decomposed into this co-located CSS file; the block-owned article/header/copy-grid/plan-list/usage/
     redacted-attachment selectors move scoped here. block-copy, quiet-copy, and the solo
     block-role-* rules stay global (shared with RichContentRouter and InboundImageBlockView).
     Values unchanged. -->
