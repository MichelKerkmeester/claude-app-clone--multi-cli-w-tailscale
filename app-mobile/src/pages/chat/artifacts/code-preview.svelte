<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CODE PREVIEW
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface FindPart {
    readonly text: string;
    readonly mark: boolean;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

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
  import './code-preview.css';
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let scrollEl = $state<HTMLDivElement | null>(null);
  let atLiveEdgeRef = true;
  let atLiveEdge = $state(true);

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
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
  const lines = $derived(text.split('\n'));

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

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
</script>

<!-- @ds surface: code-preview — the highlighted code well, gutter, and live-edge follow. -->
<!-- @ds state: highlight (plain → pending → highlighted) via [data-highlight-status]; follow-tail
     live-edge via [data-live-edge] and the Jump to latest control. -->
<!-- @ds guardrail: do-not-edit — The highlight worker and scroll/follow live-edge logic are frozen; tokens render as inert <span> text only. -->
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
     Decomposed into this co-located CSS file. Token classes are built by concatenation ('artifact-code-token is-' +
     kind), so the .is-* suffix is not a static literal — the compounds use :global(.is-*) to stay
     un-pruned (faithful). is-wrapped is a literal in a ternary so it stays plain-scoped. Dark re-inks
     use :global(:root[data-theme='dark']). .artifact-jump-latest ships native :hover/:focus-visible
     (no react-aria), preserved as-is. The shared .artifact-find-match (<mark>) stays global. Literal
     hex preserved. Values unchanged. -->
