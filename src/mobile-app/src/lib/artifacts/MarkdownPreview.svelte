<script module lang="ts">
  const MAX_MARKDOWN_LINES = 50_000;

  type MarkdownInline =
    | { readonly kind: 'text'; readonly value: string }
    | { readonly kind: 'strong'; readonly value: readonly MarkdownInline[] }
    | { readonly kind: 'emphasis'; readonly value: readonly MarkdownInline[] }
    | { readonly kind: 'code'; readonly value: string }
    | { readonly kind: 'strike'; readonly value: readonly MarkdownInline[] }
    | { readonly kind: 'link'; readonly label: readonly MarkdownInline[] }
    | { readonly kind: 'image'; readonly alt: string };

  type MarkdownBlock =
    | { readonly kind: 'paragraph'; readonly lines: readonly string[] }
    | { readonly kind: 'heading'; readonly level: number; readonly text: string }
    | { readonly kind: 'quote'; readonly lines: readonly string[] }
    | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
    | { readonly kind: 'code'; readonly text: string }
    | { readonly kind: 'rule' };

  function inlineText(value: string): MarkdownInline {
    return { kind: 'text', value };
  }

  function parseInline(source: string): readonly MarkdownInline[] {
    const nodes: MarkdownInline[] = [];
    const pattern =
      /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|~~([^~]+)~~|!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\([^)]*\)|\*([^*]+)\*|_([^_]+)_)/gu;
    let cursor = 0;
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? cursor;
      if (start > cursor) nodes.push(inlineText(source.slice(cursor, start)));
      if (match[2] !== undefined || match[3] !== undefined) {
        nodes.push({ kind: 'strong', value: parseInline(match[2] ?? match[3] ?? '') });
      } else if (match[4] !== undefined) {
        nodes.push({ kind: 'code', value: match[4] });
      } else if (match[5] !== undefined) {
        nodes.push({ kind: 'strike', value: parseInline(match[5]) });
      } else if (match[6] !== undefined) {
        nodes.push({ kind: 'image', alt: match[6] || 'Image omitted' });
      } else if (match[7] !== undefined) {
        nodes.push({ kind: 'link', label: parseInline(match[7]) });
      } else if (match[8] !== undefined || match[9] !== undefined) {
        nodes.push({ kind: 'emphasis', value: parseInline(match[8] ?? match[9] ?? '') });
      }
      cursor = start + match[0].length;
    }
    if (cursor < source.length) nodes.push(inlineText(source.slice(cursor)));
    return nodes;
  }

  export function parseMarkdown(text: string): readonly MarkdownBlock[] {
    const lines = text.split('\n').slice(0, MAX_MARKDOWN_LINES);
    const blocks: MarkdownBlock[] = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index] ?? '';
      if (line.trim() === '') {
        index += 1;
        continue;
      }
      const fence = /^\s*(```+|~~~+)\s*[^\n]*$/u.exec(line);
      if (fence !== null) {
        const closing = fence[1]?.startsWith('`') ? /^\s*```+\s*$/u : /^\s*~~~+\s*$/u;
        const codeLines: string[] = [];
        index += 1;
        while (index < lines.length && !closing.test(lines[index] ?? '')) {
          codeLines.push(lines[index] ?? '');
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push({ kind: 'code', text: codeLines.join('\n') });
        continue;
      }
      const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
      if (heading !== null) {
        blocks.push({ kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' });
        index += 1;
        continue;
      }
      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/u.test(line)) {
        blocks.push({ kind: 'rule' });
        index += 1;
        continue;
      }
      if (/^\s*>/u.test(line)) {
        const quoteLines: string[] = [];
        while (index < lines.length && /^\s*>/u.test(lines[index] ?? '')) {
          quoteLines.push((lines[index] ?? '').replace(/^\s*>\s?/u, ''));
          index += 1;
        }
        blocks.push({ kind: 'quote', lines: quoteLines });
        continue;
      }
      const listItem = /^\s*([-+*]|\d+[.)])\s+(.+)$/u.exec(line);
      if (listItem !== null) {
        const ordered = /^\d/u.test(listItem[1] ?? '');
        const items: string[] = [];
        while (index < lines.length) {
          const current = /^\s*([-+*]|\d+[.)])\s+(.+)$/u.exec(lines[index] ?? '');
          if (current === null || /^\d/u.test(current[1] ?? '') !== ordered) break;
          items.push(current[2] ?? '');
          index += 1;
        }
        blocks.push({ kind: 'list', ordered, items });
        continue;
      }
      const paragraph: string[] = [line];
      index += 1;
      while (
        index < lines.length &&
        (lines[index] ?? '').trim() !== '' &&
        !/^(#{1,6})\s/u.test(lines[index] ?? '') &&
        !/^\s*(?:[-+*]|\d+[.)])\s+/u.test(lines[index] ?? '') &&
        !/^\s*>/u.test(lines[index] ?? '')
      ) {
        paragraph.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push({ kind: 'paragraph', lines: paragraph });
    }
    if (text.split('\n').length > MAX_MARKDOWN_LINES) {
      blocks.push({
        kind: 'paragraph',
        lines: ['Additional content is not rendered in this bounded preview.'],
      });
    }
    return blocks;
  }
</script>

<script lang="ts">
  interface Props {
    text: string;
    ariaLabel?: string;
    findTerm?: string;
  }

  let { text, ariaLabel = 'Markdown preview', findTerm = '' }: Props = $props();

  const blocks = $derived(parseMarkdown(text));
</script>

{#snippet inline(nodes: readonly MarkdownInline[])}{#each nodes as node, index (index)}{#if node.kind === 'text'}{node.value}{:else if node.kind === 'strong'}<strong>{@render inline(node.value)}</strong>{:else if node.kind === 'emphasis'}<em>{@render inline(node.value)}</em>{:else if node.kind === 'code'}<code>{node.value}</code>{:else if node.kind === 'strike'}<del>{@render inline(node.value)}</del>{:else if node.kind === 'link'}<span class="artifact-markdown-link" data-navigation="disabled">{@render inline(node.label)}</span>{:else if node.kind === 'image'}<span class="artifact-markdown-image">[{node.alt}]</span>{/if}{/each}{/snippet}

<!-- @ds surface: markdown-preview — the bounded safe-Markdown renderer well. -->
<!-- @ds state: ready · empty · whitespace — empty/whitespace swap the read content. -->
<!-- @ds guardrail: do-not-edit — parseMarkdown is a bounded allowlist parser (no raw HTML;
     links/images render as inert spans); rendering is unchanged. -->
{#if text.length === 0}
  <p class="artifact-empty-preview">This preview is empty.</p>
{:else if text.trim().length === 0}
  <p class="artifact-empty-preview">This preview contains whitespace only.</p>
{:else}
  <article class="artifact-markdown-preview" aria-label={ariaLabel} dir="auto" data-display-buffer="true" data-find-term={findTerm || undefined}>{#each blocks as block, index (index)}{#if block.kind === 'heading'}<svelte:element this={`h${block.level}`}>{@render inline(parseInline(block.text))}</svelte:element>{:else if block.kind === 'paragraph'}<p>{@render inline(parseInline(block.lines.join('\n')))}</p>{:else if block.kind === 'quote'}<blockquote>{@render inline(parseInline(block.lines.join('\n')))}</blockquote>{:else if block.kind === 'list'}<svelte:element this={block.ordered ? 'ol' : 'ul'}>{#each block.items as item, itemIndex (itemIndex)}<li>{@render inline(parseInline(item))}</li>{/each}</svelte:element>{:else if block.kind === 'code'}<pre class="artifact-markdown-code"><code>{block.text}</code></pre>{:else if block.kind === 'rule'}<hr />{/if}{/each}</article>
{/if}
