<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';

  import { findParts } from '../transcript/transcript-find-index.js';
  import {
    normalizeHighlightLanguage,
    useHighlightedCode,
  } from '../rich-content/use-highlighted-code.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    text: string;
    language?: string;
    wrap?: boolean;
    findTerm?: string;
    findMatchIndex?: number;
    onFindMatchCountChange?: (count: number) => void;
    onFindMatchChange?: (index: number) => void;
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
    findMatchIndex,
    onFindMatchCountChange,
    onFindMatchChange,
    ariaLabel = 'Code preview',
    enableHighlighting = true,
    revision = 1,
    followTail = false,
  }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. FIND HELPERS
  // ───────────────────────────────────────────────────────────────────

  interface IndexedFindPart {
    readonly text: string;
    readonly mark: boolean;
    readonly matchIndex: number | null;
  }

  interface IndexedTokenParts {
    readonly kind: string;
    readonly parts: readonly IndexedFindPart[];
  }

  interface FindStateDetail {
    readonly term: string;
    readonly count: number;
    readonly index: number;
  }

  interface FindStepDetail {
    readonly term: string;
    readonly direction: 'next' | 'previous';
  }

  const FIND_STEP_EVENT = 'artifact-find-step';
  const FIND_STATE_EVENT = 'artifact-find-state';

  // Keep indexed find parts aligned with the highlight-all renderer.
  function indexFindParts(text: string, term: string, startIndex: number): { readonly parts: readonly IndexedFindPart[]; readonly nextIndex: number } {
    let nextIndex = startIndex;
    const parts = findParts(text, term).map((part) => {
      if (!part.mark) return { ...part, matchIndex: null };
      nextIndex += 1;
      return { ...part, matchIndex: nextIndex };
    });
    return { parts, nextIndex };
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let scrollEl = $state<HTMLDivElement | null>(null);
  let atLiveEdgeRef = true;
  let atLiveEdge = $state(true);
  let currentFindIndex = $state(0);

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

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
  const lineNumbers = $derived(text.split('\n').map((_, index) => index + 1));
  const plainFindParts = $derived(indexFindParts(text, findTerm, 0).parts);
  const tokenFindParts = $derived.by(() => {
    if (tokens === null) return null;
    let matchIndex = 0;
    return tokens.map((token): IndexedTokenParts => {
      const indexed = indexFindParts(token.text, findTerm, matchIndex);
      matchIndex = indexed.nextIndex;
      return { kind: token.kind, parts: indexed.parts };
    });
  });
  const findMatchCount = $derived(
    tokenFindParts === null
      ? plainFindParts.filter((part) => part.mark).length
      : tokenFindParts.reduce((count, token) => count + token.parts.filter((part) => part.mark).length, 0),
  );
  const activeFindIndex = $derived(findMatchIndex ?? currentFindIndex);

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    void followTail;
    void revision;
    void text;
    if (!followTail || !atLiveEdgeRef) return;
    const scroll = scrollEl;
    if (scroll !== null) scroll.scrollTop = scroll.scrollHeight;
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (!followTail) {
      atLiveEdgeRef = true;
      atLiveEdge = true;
    }
  });

  // Reset the current match whenever the searchable content changes.
  $effect(() => {
    const count = findMatchCount;
    void findTerm;
    void text;
    if (findMatchIndex !== undefined) return;
    untrack(() => {
      const nextIndex = count > 0 ? 1 : 0;
      if (currentFindIndex !== nextIndex) currentFindIndex = nextIndex;
    });
  });

  // Keep the sibling find control synchronized without coupling the render tree.
  $effect(() => {
    const term = findTerm;
    const handleFindStep = (event: Event): void => {
      const detail = (event as CustomEvent<FindStepDetail>).detail;
      if (detail?.term !== term || findMatchIndex !== undefined) return;
      untrack(() => {
        if (findMatchCount === 0) return;
        currentFindIndex = detail.direction === 'next'
          ? currentFindIndex === findMatchCount ? 1 : currentFindIndex + 1
          : currentFindIndex <= 1 ? findMatchCount : currentFindIndex - 1;
      });
    };
    window.addEventListener(FIND_STEP_EVENT, handleFindStep);
    return () => window.removeEventListener(FIND_STEP_EVENT, handleFindStep);
  });

  // Publish the count and current match for a sibling find control or a controlled parent.
  $effect(() => {
    const count = findMatchCount;
    const index = activeFindIndex;
    const term = findTerm;
    untrack(() => {
      onFindMatchCountChange?.(count);
      onFindMatchChange?.(index);
      window.dispatchEvent(new CustomEvent<FindStateDetail>(FIND_STATE_EVENT, { detail: { term, count, index } }));
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep update live edge focused on its single responsibility.
  function updateLiveEdge(): void {
    const scroll = scrollEl;
    if (scroll === null) return;
    const nextAtLiveEdge = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= 96;
    atLiveEdgeRef = nextAtLiveEdge;
    if (atLiveEdge !== nextAtLiveEdge) atLiveEdge = nextAtLiveEdge;
  }

  // Keep jump to latest focused on its single responsibility.
  function jumpToLatest(): void {
    const scroll = scrollEl;
    if (scroll === null) return;
    scroll.scrollTop = scroll.scrollHeight;
    atLiveEdgeRef = true;
    atLiveEdge = true;
  }
</script>

<!-- Component content -->
<!-- Code preview -->
<!-- This surface: code-preview — the highlighted code well, gutter, and live-edge follow. -->
<!-- This state: highlight (plain → pending → highlighted) via [data-highlight-status]; follow-tail
     live-edge via [data-live-edge] and the Jump to latest control. -->
<!-- Do not edit — The highlight worker and scroll/follow live-edge logic are frozen; tokens render as inert <span> text only. -->
<div class="artifact-code--viewer" data-live-edge={followTail ? atLiveEdge : undefined}>
  <div
    class={`artifact-code--preview${wrap ? ' is-wrapped' : ''}`}
    bind:this={scrollEl}
    data-language={safeLanguage ?? 'plaintext'}
    data-highlight-status={status}
    data-revision={revisionId}
    aria-label={ariaLabel}
    dir="ltr"
    data-display-buffer="true"
    onscroll={followTail ? updateLiveEdge : undefined}
  >
    <div class="artifact-code--gutter" aria-hidden="true" style="user-select: none; -webkit-user-select: none;">{#each lineNumbers as lineNumber (lineNumber)}<span>{lineNumber}</span>{/each}</div>
    <pre class="artifact-code--source"><code>{#if tokenFindParts === null}{#each plainFindParts as part, partIndex (partIndex)}{#if part.mark}<mark class={`artifact-find--match${part.matchIndex === activeFindIndex ? ' is-current' : ''}`} data-find-index={part.matchIndex} aria-current={part.matchIndex === activeFindIndex ? 'true' : undefined}>{part.text}</mark>{:else}{part.text}{/if}{/each}{:else}{#each tokenFindParts as token, index (index)}<span class={'artifact-code--token is-' + token.kind}>{#each token.parts as part, partIndex (partIndex)}{#if part.mark}<mark class={`artifact-find--match${part.matchIndex === activeFindIndex ? ' is-current' : ''}`} data-find-index={part.matchIndex} aria-current={part.matchIndex === activeFindIndex ? 'true' : undefined}>{part.text}</mark>{:else}{part.text}{/if}{/each}</span>{/each}{/if}</code></pre>
  </div>
  {#if followTail && !atLiveEdge}
    <button type="button" class="artifact--jump-latest" onclick={jumpToLatest}>Jump to latest</button>
  {/if}
</div>

<!-- Artifact code preview -->
<!-- This surface: artifact-code--preview — the highlighted code well, gutter, tokens, and jump-to-latest.
     Decomposed into this scoped block. Token classes are built by concatenation ('artifact-code--token is-' +
     kind), so the .is-* suffix is not a static literal — the compounds use :global(.is-*) to stay
     un-pruned (faithful). is-wrapped is a literal in a ternary so it stays plain-scoped. Dark re-inks
     use :global(:root[data-theme='dark']). .artifact--jump-latest ships native :hover/:focus-visible
     (no react-aria), preserved as-is. The shared .artifact-find--match (<mark>) stays global. Literal
     hex preserved. Values unchanged. -->
<style>
  /* This slot: code-viewer — the relative frame owning the follow-tail control. */
  .artifact-code--viewer {
    position: relative;
    min-inline-size: 0;
  }

  /* This slot: code-well — the scrollable highlighted code surface. */
  /* Do not edit — Bounded reading well; selectable and pan-scoped; never overflow the page. */
  .artifact-code--preview {
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

  /* This slot: gutter — the line-number rail. */
  .artifact-code--gutter {
    display: grid;
    align-content: start;
    padding: 1rem 0.7rem;
    border-inline-end: 1px solid #6c6a65;
    color: #6c6a65;
    text-align: end;
    user-select: none;
    -webkit-user-select: none;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .artifact-code--gutter span {
    min-block-size: 1.65em;
  }

  /* This slot: source — the highlighted code column. */
  .artifact-code--source {
    min-inline-size: max-content;
    margin: 0;
    padding: 1rem;
    overflow: visible;
    font: inherit;
    white-space: pre;
    user-select: text;
  }

  /* This state: wrapped — soft-wrap toggle rewraps the source column. */
  .artifact-code--preview.is-wrapped .artifact-code--source {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  /* This slot: token — syntax tokens (kind suffix is dynamic; :global keeps the compounds live). */
  .artifact-code--token:global(.is-keyword),
  .artifact-code--token:global(.is-boolean),
  .artifact-code--token:global(.is-tag),
  .artifact-code--token:global(.is-heading),
  .artifact-code--token:global(.is-ansi),
  .artifact-code--token:global(.is-diff-add),
  .artifact-code--token:global(.is-diff-remove) {
    color: #f0b19a;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .artifact-code--token:global(.is-string),
  .artifact-code--token:global(.is-number) {
    color: #d97757;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .artifact-code--token:global(.is-comment) {
    color: #9f998f;
  }

  /* This state: current-match — distinguishes the selected result without removing other marks. */
  :global(.artifact-find--match.is-current) {
    background: var(--accent-strong);
    color: var(--ink-inverse);
  }

  /* This slot: jump-latest — the follow-tail live-edge control; ships native :hover/:focus-visible. */
  .artifact--jump-latest {
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

  /* Do not edit — focus-visible — The AA focus ring on jump-to-latest. */
  .artifact--jump-latest:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
    box-shadow: 0 0 0 5px var(--accent);
  }

  /* This state: hover — jump-to-latest under pointer hover. */
  .artifact--jump-latest:hover {
    background: var(--accent-strong);
    color: var(--ink-inverse);
  }

  /* This state: dark — dark-theme re-inks (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-code--gutter {
    color: #9f998f;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(:root[data-theme='dark']) .artifact-code--token:global(.is-comment) {
    color: #9f998f;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(:root[data-theme='dark']) .artifact-code--token:global(.is-keyword) {
    color: #f0b19a;
  }

  /* Do not edit — Reduced motion bounds the well + jump-to-latest transitions. */
  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    .artifact-code--preview {
      transition-duration: 100ms;
      scroll-behavior: auto;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .artifact--jump-latest {
      transition-duration: 100ms;
      scroll-behavior: auto;
    }
  }

  /* Editable seam: layout — narrow reflow: full-width jump-to-latest at <=20rem. */
  @media (max-width: 20rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .artifact--jump-latest {
      inline-size: 100%;
    }
  }
</style>
