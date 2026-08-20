<script module lang="ts">
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
<!-- @ds guardrail: do-not-edit — chunked rendering keeps the buffer bounded; find highlighting
     renders inert <mark> text only. -->
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
