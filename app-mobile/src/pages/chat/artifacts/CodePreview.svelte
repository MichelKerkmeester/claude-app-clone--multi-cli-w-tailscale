<script module lang="ts">
  interface FindPart {
    readonly text: string;
    readonly mark: boolean;
  }

  function findParts(text: string, findTerm: string): readonly FindPart[] {
    if (findTerm.trim().length === 0) return [{ text, mark: false }];
    const needle = findTerm.toLocaleLowerCase();
    const source = text.toLocaleLowerCase();
    const parts: FindPart[] = [];
    let cursor = 0;
    let match = source.indexOf(needle, cursor);
    while (match >= 0) {
      if (match > cursor) parts.push({ text: text.slice(cursor, match), mark: false });
      parts.push({ text: text.slice(match, match + findTerm.length), mark: true });
      cursor = match + findTerm.length;
      match = source.indexOf(needle, cursor);
    }
    if (cursor === 0) return [{ text, mark: false }];
    if (cursor < text.length) parts.push({ text: text.slice(cursor), mark: false });
    return parts;
  }
</script>

<script lang="ts">
  import {
    normalizeHighlightLanguage,
    useHighlightedCode,
  } from '../rich-content/useHighlightedCode.svelte.js';

  interface Props {
    text: string;
    language?: string;
    wrap?: boolean;
    findTerm?: string;
    ariaLabel?: string;
    enableHighlighting?: boolean;
    revision?: string | number;
    followTail?: boolean;
  }

  let {
    text,
    language,
    wrap = false,
    findTerm = '',
    ariaLabel = 'Code preview',
    enableHighlighting = true,
    revision = 1,
    followTail = false,
  }: Props = $props();

  const safeLanguage = $derived(normalizeHighlightLanguage(language));
  const highlighted = useHighlightedCode(() => ({
    source: text,
    language: safeLanguage,
    revision,
    enabled: enableHighlighting,
  }));
  const status = $derived(highlighted.current.status);
  const revisionId = $derived(highlighted.current.revisionId);
  const tokens = $derived(highlighted.current.tokens);
  const lines = $derived(text.split('\n'));

  let scrollEl = $state<HTMLDivElement | null>(null);
  let atLiveEdgeRef = true;
  let atLiveEdge = $state(true);

  function updateLiveEdge(): void {
    const scroll = scrollEl;
    if (scroll === null) return;
    const nextAtLiveEdge = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= 96;
    atLiveEdgeRef = nextAtLiveEdge;
    if (atLiveEdge !== nextAtLiveEdge) atLiveEdge = nextAtLiveEdge;
  }

  function jumpToLatest(): void {
    const scroll = scrollEl;
    if (scroll === null) return;
    scroll.scrollTop = scroll.scrollHeight;
    atLiveEdgeRef = true;
    atLiveEdge = true;
  }

  $effect(() => {
    void followTail;
    void revision;
    void text;
    if (!followTail || !atLiveEdgeRef) return;
    const scroll = scrollEl;
    if (scroll !== null) scroll.scrollTop = scroll.scrollHeight;
  });

  $effect(() => {
    if (!followTail) {
      atLiveEdgeRef = true;
      atLiveEdge = true;
    }
  });
</script>

<!-- @ds surface: code-preview — the highlighted code well, gutter, and live-edge follow. -->
<!-- @ds state: highlight (plain → pending → highlighted) via [data-highlight-status]; follow-tail
     live-edge via [data-live-edge] and the Jump to latest control. -->
<!-- @ds guardrail: do-not-edit — the highlight worker (useHighlightedCode) and the scroll/follow
     live-edge logic are frozen; tokens render as inert <span> text only. -->
<div class="artifact-code-viewer" data-live-edge={followTail ? atLiveEdge : undefined}>
  <div
    class={`artifact-code-preview${wrap ? ' is-wrapped' : ''}`}
    bind:this={scrollEl}
    data-language={safeLanguage ?? 'plaintext'}
    data-highlight-status={status}
    data-revision={revisionId}
    aria-label={ariaLabel}
    dir="ltr"
    data-display-buffer="true"
    onscroll={followTail ? updateLiveEdge : undefined}
  >
    <div class="artifact-code-gutter" aria-hidden="true" style="user-select: none; -webkit-user-select: none;">{#each lines as _line, index (index)}<span>{index + 1}</span>{/each}</div>
    <pre class="artifact-code-source"><code>{#if tokens === null}{#each findParts(text, findTerm) as part}{#if part.mark}<mark class="artifact-find-match">{part.text}</mark>{:else}{part.text}{/if}{/each}{:else}{#each tokens as token, index (index)}<span class={'artifact-code-token is-' + token.kind}>{#each findParts(token.text, findTerm) as part}{#if part.mark}<mark class="artifact-find-match">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>{/each}{/if}</code></pre>
  </div>
  {#if followTail && !atLiveEdge}
    <button type="button" class="artifact-jump-latest" onclick={jumpToLatest}>Jump to latest</button>
  {/if}
</div>

<!-- @ds surface: artifact-code-preview — the highlighted code well, gutter, tokens, and jump-to-latest.
     Decomposed from style.css. Token classes are built by concatenation ('artifact-code-token is-' +
     kind), so the .is-* suffix is not a static literal — the compounds use :global(.is-*) to stay
     un-pruned (faithful). is-wrapped is a literal in a ternary so it stays plain-scoped. Dark re-inks
     use :global(:root[data-theme='dark']). .artifact-jump-latest ships native :hover/:focus-visible
     (no react-aria), preserved as-is. The shared .artifact-find-match (<mark>) stays global. Literal
     hex preserved. Values unchanged. -->
<style>
  /* @ds slot: code-viewer — the relative frame owning the follow-tail control. */
  .artifact-code-viewer {
    position: relative;
    min-inline-size: 0;
  }

  /* @ds slot: code-well — the scrollable highlighted code surface. */
  /* @ds guardrail: do-not-edit — bounded reading well; selectable and pan-scoped; never overflow the page. */
  .artifact-code-preview {
    overscroll-behavior: contain;
    overflow-anchor: none;
    max-block-size: min(70dvh, 42rem);
    overscroll-behavior-inline: contain;
    overscroll-behavior-block: contain;
    scrollbar-gutter: stable;
    user-select: text;
    -webkit-user-select: text;
    background: #24221f;
    color: #f8f8f6;
    display: grid;
    max-inline-size: 100%;
    grid-template-columns: auto minmax(0, 1fr);
    overflow: auto;
    border: 1px solid #6c6a65;
    border-radius: 0.5rem;
    direction: ltr;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.65;
    text-align: start;
    unicode-bidi: isolate;
  }

  /* @ds slot: gutter — the line-number rail. */
  .artifact-code-gutter {
    display: grid;
    align-content: start;
    padding: 1rem 0.7rem;
    border-inline-end: 1px solid #6c6a65;
    color: #6c6a65;
    text-align: end;
    user-select: none;
    -webkit-user-select: none;
  }

  .artifact-code-gutter span {
    min-block-size: 1.65em;
  }

  /* @ds slot: source — the highlighted code column. */
  .artifact-code-source {
    min-inline-size: max-content;
    margin: 0;
    padding: 1rem;
    overflow: visible;
    font: inherit;
    white-space: pre;
    user-select: text;
  }

  /* @ds state: wrapped — soft-wrap toggle rewraps the source column. */
  .artifact-code-preview.is-wrapped .artifact-code-source {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  /* @ds slot: token — syntax tokens (kind suffix is dynamic; :global keeps the compounds live). */
  .artifact-code-token:global(.is-keyword),
  .artifact-code-token:global(.is-boolean),
  .artifact-code-token:global(.is-tag),
  .artifact-code-token:global(.is-heading),
  .artifact-code-token:global(.is-ansi),
  .artifact-code-token:global(.is-diff-add),
  .artifact-code-token:global(.is-diff-remove) {
    color: #f0b19a;
  }

  .artifact-code-token:global(.is-string),
  .artifact-code-token:global(.is-number) {
    color: #d97757;
  }

  .artifact-code-token:global(.is-comment) {
    color: #9f998f;
  }

  /* @ds slot: jump-latest — the follow-tail live-edge control; ships native :hover/:focus-visible. */
  .artifact-jump-latest {
    min-block-size: 44px;
    min-inline-size: 44px;
    position: sticky;
    inset-block-end: var(--space-3);
    z-index: 1;
    display: block;
    margin-block-start: calc(var(--space-4) * -1);
    margin-inline: auto;
    padding-inline: var(--space-3);
    border: 1px solid var(--control-border);
    border-radius: 999px;
    background: var(--action-bg);
    color: var(--action-fg);
    cursor: pointer;
    font-size: 0.8125rem;
  }

  /* @ds guardrail: focus-visible — the AA focus ring on jump-to-latest. */
  .artifact-jump-latest:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
    box-shadow: 0 0 0 5px var(--accent);
  }

  /* @ds state: hover — jump-to-latest under pointer hover. */
  .artifact-jump-latest:hover {
    background: var(--accent-strong);
    color: var(--ink-inverse);
  }

  /* @ds state: dark — dark-theme re-inks (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-code-gutter {
    color: #9f998f;
  }

  :global(:root[data-theme='dark']) .artifact-code-token:global(.is-comment) {
    color: #9f998f;
  }

  :global(:root[data-theme='dark']) .artifact-code-token:global(.is-keyword) {
    color: #f0b19a;
  }

  /* @ds guardrail: do-not-edit — reduced-motion bounds the well + jump-to-latest transitions. */
  @media (prefers-reduced-motion: reduce) {
    .artifact-code-preview {
      transition-duration: 100ms;
      scroll-behavior: auto;
    }

    .artifact-jump-latest {
      transition-duration: 100ms;
      scroll-behavior: auto;
    }
  }

  /* @ds edit: layout — narrow reflow: full-width jump-to-latest at <=20rem. */
  @media (max-width: 20rem) {
    .artifact-jump-latest {
      inline-size: 100%;
    }
  }
</style>
