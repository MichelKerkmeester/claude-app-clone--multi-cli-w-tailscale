<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { NormalizedCodeBlock } from './normalize-transcript-blocks.js';
  import RichBlockFrame from './rich-block-frame.svelte';
  import { useCopyFeedback } from './use-copy-feedback.svelte.js';
  import { useHighlightedCode, type HighlightToken } from './use-highlighted-code.svelte.js';
  import { hover } from '$shared/primitives/a11y/interactions.js';

  import './card-code.css';

  interface Props {
    block: NormalizedCodeBlock;
    onOpen?: (trigger?: HTMLButtonElement | null) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, onOpen }: Props = $props();

  const PREVIEW_LINES = 12;

  const feedback = useCopyFeedback();

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const lines = $derived(displayLines(block.canonicalSource));
  const preview = $derived(lines.slice(0, PREVIEW_LINES).join('\n'));
  const canOpen = $derived(block.canonicalSource.length > 0 && onOpen !== undefined);

  // ───────────────────────────────────────────────────────────────────
  // 4. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let openButton = $state<HTMLButtonElement | null>(null);
  const highlighted = useHighlightedCode(() => ({
    source: block.canonicalSource,
    language: block.language,
    revision: block.revision,
  }));
  const previewTokens = $derived(
    highlighted.current.tokens === null
      ? null
      : clipTokens(highlighted.current.tokens, preview.length),
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function displayLines(value: string): string[] {
    const result = value.split(/\r?\n/u);
    if (result.at(-1) === '') result.pop();
    return result;
  }

  function clipTokens(
    tokens: readonly HighlightToken[],
    length: number,
  ): readonly HighlightToken[] {
    if (length <= 0) return [];
    const clipped: HighlightToken[] = [];
    let remaining = length;
    for (const token of tokens) {
      if (remaining <= 0) break;
      const text = token.text.slice(0, remaining);
      if (text.length > 0) clipped.push({ ...token, text });
      remaining -= text.length;
    }
    return clipped;
  }
</script>

{#snippet actionsSnippet()}
  <!-- @ds slot: actions — Copy source + full-screen Open handoff. -->
  <!-- @ds guardrail: do-not-edit — The exact-copy clipboard boundary; Open is a pass-through with no fetch/endpoint/ticket/download/host-file read. -->
  {#if feedback.canCopy}
    <button
      class="rich-block-action"
      use:hover
      aria-label={feedback.actionLabel('code')}
      onclick={() => feedback.copy('code', block.canonicalSource)}
    >{feedback.actionLabel('code')}</button>
  {/if}
  {#if canOpen}
    <button class="rich-block-action" use:hover bind:this={openButton} onclick={() => onOpen?.(openButton)}
      >Open full screen</button>
  {/if}
{/snippet}

<RichBlockFrame
  title={block.languageLabel}
  eyebrow="Code"
  metadata={[
    `${lines.length} lines`,
    block.incomplete
      ? 'Incomplete fence'
      : highlighted.current.status === 'highlighted'
        ? 'Highlighted'
        : 'Plain text',
  ]}
  redaction={block.redaction}
  class="rich-code-card"
  {...(feedback.canCopy || canOpen ? { actions: actionsSnippet } : {})}
>
  <!-- @ds slot: code-preview — horizontally panning viewport; code scrolls inside
       its own box and never overflows the page. -->
  <div class="rich-code-preview" data-code-pan="true">
    <!-- @ds state: code — plaintext-first; data-highlight-status (plain · pending ·
         highlighted) advances with the worker.
         @ds guardrail: do-not-edit — The status attribute and token rendering are behavior owned by the highlight lifecycle. -->
    <pre aria-label={`${block.languageLabel} code preview`}><code data-highlight-status={highlighted.current.status}>{#if previewTokens === null}{preview}{:else}{#each previewTokens as token, index (index)}<span class={`rich-code-token is-${token.kind}`}>{token.text}</span>{/each}{/if}</code></pre>
  </div>
  {#if lines.length > PREVIEW_LINES}
    <p class="rich-continuation">{lines.length - PREVIEW_LINES} more lines</p>
  {/if}
  <!-- @ds guardrail: do-not-edit — Polite live region announcing Copy outcomes. -->
  <p class="rich-copy-status" role="status" aria-live="polite">{feedback.announcement}</p>
</RichBlockFrame>
