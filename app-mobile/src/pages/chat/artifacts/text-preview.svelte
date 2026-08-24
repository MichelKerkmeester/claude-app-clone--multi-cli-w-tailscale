<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TEXT PREVIEW
  // ───────────────────────────────────────────────────────────────────

  const TEXT_CHUNK_SIZE = 8_192;

  interface FindPart {
    readonly text: string;
    readonly mark: boolean;
  }

  function chunkText(text: string): readonly string[] {
    if (text.length <= TEXT_CHUNK_SIZE) return [text];
    const chunks: string[] = [];
    for (let offset = 0; offset < text.length; offset += TEXT_CHUNK_SIZE) {
      chunks.push(text.slice(offset, offset + TEXT_CHUNK_SIZE));
    }
    return chunks;
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
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    text: string;
    ariaLabel?: string;
    wrap?: boolean;
    findTerm?: string;
  }

  let { text, ariaLabel = 'Text preview', wrap = false, findTerm = '' }: Props = $props();
</script>

<!-- @ds surface: text-preview — the plain-text read well. -->
<!-- @ds state: ready · empty · whitespace — the empty/whitespace copy swaps the read content. -->
<!-- @ds guardrail: do-not-edit — Chunked rendering keeps the buffer bounded, while find highlighting renders inert <mark> text only. -->
{#if text.length === 0}
  <p class="artifact-empty-preview">This preview is empty.</p>
{:else if text.trim().length === 0}
  <p class="artifact-empty-preview">This preview contains whitespace only.</p>
{:else}
  <div
    class={`artifact-text-preview${wrap ? ' is-wrapped' : ''}`}
    aria-label={ariaLabel}
    dir="auto"
    data-display-buffer="true"
  >{#each chunkText(text) as chunk, index (index)}<span class="artifact-text-chunk" data-text-chunk={index}>{#each findParts(chunk, findTerm) as part}{#if part.mark}<mark class="artifact-find-match">{part.text}</mark>{:else}{part.text}{/if}{/each}</span>{/each}</div>
{/if}

<!-- @ds surface: artifact-text-preview — the plain-text read well. Decomposed into this scoped block; the base
     merges the shared well-guardrail group with the text-well layout into one faithful rule. is-wrapped
     is a local soft-wrap modifier; the dark re-ink uses :global(:root[data-theme='dark']). The shared
     .artifact-empty-preview (empty/whitespace notice) and .artifact-find-match (find <mark>) stay global
     — rendered by multiple previews. Literal hex preserved. Values unchanged. -->
<style>
  /* @ds slot: text-well — plain-text read-out. */
  /* @ds guardrail: do-not-edit — Bounded reading well; selectable and pan-scoped. */
  .artifact-text-preview {
    overscroll-behavior: contain;
    overflow-anchor: none;
    max-inline-size: 100%;
    max-block-size: 100%;
    overflow: auto;
    color: #24221f;
    font-family: var(--font-display);
    font-size: 1rem;
    line-height: 1.65;
    text-align: start;
    user-select: text;
    unicode-bidi: plaintext;
    margin: 0;
    padding: 1rem;
    border: 1px solid #6c6a65;
    border-radius: 0.5rem;
    background: #ffffff;
    white-space: pre;
    overflow-wrap: normal;
  }

  /* @ds state: wrapped — soft-wrap toggle. */
  .artifact-text-preview.is-wrapped {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* @ds slot: text-chunk — one bounded render chunk. */
  .artifact-text-chunk {
    display: inline;
  }

  /* @ds state: dark — dark-theme re-ink (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-text-preview {
    background: #2d2a26;
    color: #f8f8f6;
  }
</style>
