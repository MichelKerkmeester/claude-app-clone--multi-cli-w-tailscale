<script module lang="ts">
  // This module holds the shared Safe Markdown types and helpers.
  // This surface: safe-markdown — renders already-redacted Markdown to safe prose.
  // Do not edit — This module is the read-only sanitization boundary; the allowlist, URL/scheme filtering, and character escaping are frozen and NOT designer-editable.

  import { classifyProseLink } from './prose-link.js';

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface ParagraphNode {
    readonly kind: 'paragraph';
    readonly text: string;
  }

  interface HeadingNode {
    readonly kind: 'heading';
    readonly level: 1 | 2 | 3 | 4 | 5 | 6;
    readonly text: string;
  }

  interface QuoteNode {
    readonly kind: 'quote';
    readonly text: string;
  }

  interface ListNode {
    readonly kind: 'list';
    readonly ordered: boolean;
    readonly items: readonly string[];
  }

  interface TableNode {
    readonly kind: 'table';
    readonly headings: readonly string[];
    readonly rows: readonly (readonly string[])[];
  }

  interface CodeNode {
    readonly kind: 'code';
    readonly language: string | null;
    readonly source: string;
  }

  type SafeMarkdownNode = ParagraphNode | HeadingNode | QuoteNode | ListNode | TableNode | CodeNode;

  type SafeMarkdownInlinePart =
    | { readonly kind: 'text'; readonly text: string }
    | { readonly kind: 'code'; readonly text: string }
    | { readonly kind: 'strong'; readonly text: string }
    | { readonly kind: 'em'; readonly text: string }
    | { readonly kind: 'del'; readonly text: string }
    | {
        readonly kind: 'link';
        readonly text: string;
        readonly href: string;
        readonly mode: 'external' | 'unavailable';
      };

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — The sanitization patterns reject raw HTML/markup, unsafe URL schemes, and control/bidi characters verbatim; do not broaden them.
  const RAW_HTML_PATTERN =
    /<\s*\/?\s*(?:script|style|form|input|textarea|button|img|iframe|frame|object|embed|audio|video|source|svg|link|meta|base)\b|<\s*\/?\s*[a-z][^>]*>/iu;
  const RAW_MARKUP_PATTERN = /<!--[\s\S]*?-->|<!doctype\b|<!\[cdata\[/iu;
  const UNSAFE_SCHEME_PATTERN = /(?:javascript|vbscript|data|file|blob):/iu;
  const MARKDOWN_DESTINATION_PATTERN = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/gu;
  const ANY_MARKDOWN_DESTINATION_PATTERN =
    /!?\[[^\]\r\n]*\]\(\s*<?([^)\r\n>]*)>?(?:\s+["'][^"']*["'])?\s*\)/gu;
  const ANSI_ESCAPE = String.fromCharCode(0x1b);
  const ANSI_BELL = String.fromCharCode(0x07);
  const ANSI_SEQUENCE_PATTERN = new RegExp(
    `${ANSI_ESCAPE}(?:\\[[0-?]*[ -/]*[@-~]|\\][^${ANSI_BELL}]*(?:${ANSI_BELL}|${ANSI_ESCAPE}\\\\))`,
    'gu',
  );
  const ASCII_CONTROL_CLASS = [
    characterRange(0x00, 0x08),
    characterRange(0x0b, 0x0c),
    characterRange(0x0e, 0x1f),
    characterRange(0x7f, 0x9f),
  ].join('');
  const BIDI_CONTROL_CLASS = [
    characterRange(0x061c, 0x061c),
    characterRange(0x200e, 0x200f),
    characterRange(0x202a, 0x202e),
    characterRange(0x2066, 0x2069),
  ].join('');
  const CONTROL_CHARACTER_PATTERN = new RegExp(`[${ASCII_CONTROL_CLASS}${BIDI_CONTROL_CLASS}]`, 'u');
  const BIDI_CONTROL_PATTERN = new RegExp(`[${BIDI_CONTROL_CLASS}]`, 'gu');
  const ASCII_CONTROL_PATTERN = new RegExp(`[${ASCII_CONTROL_CLASS}]`, 'gu');
  const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/u;
  // Module LRU for parsed markdown. A reactive map would write during $derived.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- parse cache is not UI state
  const PARSE_CACHE = new Map<string, readonly SafeMarkdownNode[] | null>();
  const PARSE_CACHE_LIMIT = 256;

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — parseSafeMarkdown is the fail-closed AST boundary: unsafe input returns null and SafeMarkdown falls back to escaped verbatim text.
  export function parseSafeMarkdown(source: string): readonly SafeMarkdownNode[] | null {
    const cached = PARSE_CACHE.get(source);
    if (cached !== undefined) return cached;
    const parsed = parseSafeMarkdownUncached(source);
    PARSE_CACHE.set(source, parsed);
    if (PARSE_CACHE.size > PARSE_CACHE_LIMIT) {
      const oldest = PARSE_CACHE.keys().next().value;
      if (oldest !== undefined) PARSE_CACHE.delete(oldest);
    }
    return parsed;
  }

  function parseSafeMarkdownUncached(source: string): readonly SafeMarkdownNode[] | null {
    if (isUnsafeMarkdown(source)) return null;
    const lines = source.split(/\r?\n/u);
    const nodes: SafeMarkdownNode[] = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index] ?? '';
      if (line.trim().length === 0) {
        index += 1;
        continue;
      }
      const fence = FENCE_PATTERN.exec(line);
      if (fence !== null) {
        const marker = fence[1] ?? '';
        const info = (fence[2] ?? '').trim().split(/[ \t]/u, 1)[0] ?? '';
        const codeLines: string[] = [];
        let cursor = index + 1;
        let closed = false;
        while (cursor < lines.length) {
          const candidate = lines[cursor] ?? '';
          if (
            new RegExp(
              `^ {0,3}${escapeRegExp(marker.charAt(0))}{${marker.length},}[ \\t]*$`,
              'u',
            ).test(candidate)
          ) {
            closed = true;
            break;
          }
          codeLines.push(candidate);
          cursor += 1;
        }
        if (!closed) return null;
        nodes.push({
          kind: 'code',
          language: info.length > 0 ? safeLanguageLabel(info) : null,
          source: codeLines.length === 0 ? '' : `${codeLines.join('\n')}\n`,
        });
        index = cursor + 1;
        continue;
      }
      const heading = /^( {0,3})(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/u.exec(line);
      if (heading !== null) {
        nodes.push({
          kind: 'heading',
          level: Math.min(6, Math.max(1, (heading[2] ?? '').length)) as HeadingNode['level'],
          text: heading[3] ?? '',
        });
        index += 1;
        continue;
      }
      if (/^ {0,3}>[ \t]?/u.test(line)) {
        const quoteLines: string[] = [];
        while (index < lines.length && /^ {0,3}>[ \t]?/u.test(lines[index] ?? '')) {
          quoteLines.push((lines[index] ?? '').replace(/^ {0,3}>[ \t]?/u, ''));
          index += 1;
        }
        nodes.push({ kind: 'quote', text: quoteLines.join('\n') });
        continue;
      }
      const list = listStart(line);
      if (list !== null) {
        const items: string[] = [];
        const ordered = list.ordered;
        while (index < lines.length) {
          const current = listStart(lines[index] ?? '');
          if (current === null || current.ordered !== ordered) break;
          items.push(current.text);
          index += 1;
        }
        nodes.push({ kind: 'list', ordered, items });
        continue;
      }
      if (isTableHeader(lines, index)) {
        const headings = splitTableRow(lines[index] ?? '');
        const rows: (readonly string[])[] = [];
        index += 2;
        while (index < lines.length && lines[index]?.includes('|') && lines[index]?.trim() !== '') {
          rows.push(splitTableRow(lines[index] ?? ''));
          index += 1;
        }
        nodes.push({ kind: 'table', headings, rows });
        continue;
      }
      const paragraph: string[] = [line];
      index += 1;
      while (index < lines.length) {
        const next = lines[index] ?? '';
        if (
          next.trim().length === 0 ||
          FENCE_PATTERN.test(next) ||
          /^( {0,3})(#{1,6})[ \t]+/u.test(next) ||
          /^ {0,3}>[ \t]?/u.test(next) ||
          listStart(next) !== null
        ) {
          break;
        }
        paragraph.push(next);
        index += 1;
      }
      nodes.push({ kind: 'paragraph', text: paragraph.join('\n') });
    }
    return nodes;
  }

  // Do not edit — Inline rendering interprets only the fixed tokenPattern; other runs stay plain and every link destination is scheme-filtered.
  function renderInlineParts(source: string): readonly SafeMarkdownInlinePart[] {
    const parts: SafeMarkdownInlinePart[] = [];
    let remaining = source;
    const tokenPattern =
      /(`[^`\n]*`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|!?\[[^\]\n]+\]\([^)\n]+\))/u;
    while (remaining.length > 0) {
      const match = tokenPattern.exec(remaining);
      if (match === null) {
        parts.push({ kind: 'text', text: remaining });
        break;
      }
      const start = match.index;
      if (start > 0) parts.push({ kind: 'text', text: remaining.slice(0, start) });
      const token = match[0];
      if (token.startsWith('`')) {
        parts.push({ kind: 'code', text: token.slice(1, -1) });
      } else if (token.startsWith('**') || token.startsWith('__')) {
        parts.push({ kind: 'strong', text: token.slice(2, -2) });
      } else if (token.startsWith('~~')) {
        parts.push({ kind: 'del', text: token.slice(2, -2) });
      } else if (token.startsWith('*') || token.startsWith('_')) {
        parts.push({ kind: 'em', text: token.slice(1, -1) });
      } else if (token.startsWith('![')) {
        const alt = token.slice(2, token.indexOf(']'));
        parts.push({ kind: 'text', text: alt });
      } else {
        const labelEnd = token.indexOf(']');
        const destStart = token.indexOf('(', labelEnd);
        const destEnd = token.lastIndexOf(')');
        const label = token.slice(1, labelEnd);
        const rawDest =
          destStart >= 0 && destEnd > destStart ? token.slice(destStart + 1, destEnd).trim() : '';
        const dest = rawDest.replace(/^<|>$/u, '');
        const classified = classifyProseLink(dest);
        parts.push({
          kind: 'link',
          text: label,
          href: classified.destination,
          mode: classified.kind === 'external-url' ? 'external' : 'unavailable',
        });
      }
      remaining = remaining.slice(start + token.length);
    }
    return parts;
  }

  // Do not edit — The sanitization gate rejects raw HTML/markup, control characters, and unsafe schemes in every Markdown destination.
  function isUnsafeMarkdown(source: string): boolean {
    if (
      RAW_HTML_PATTERN.test(source) ||
      RAW_MARKUP_PATTERN.test(source) ||
      CONTROL_CHARACTER_PATTERN.test(source) ||
      UNSAFE_SCHEME_PATTERN.test(normalizeForSchemeCheck(source))
    ) {
      return true;
    }
    for (const pattern of [MARKDOWN_DESTINATION_PATTERN, ANY_MARKDOWN_DESTINATION_PATTERN]) {
      for (const match of source.matchAll(pattern)) {
        const destination = match[1] ?? '';
        if (UNSAFE_SCHEME_PATTERN.test(normalizeForSchemeCheck(destination))) return true;
      }
    }
    return false;
  }

  // Do not edit — Normalize destinations before the unsafe-scheme check so control characters and percent-encoding cannot hide a match.
  function normalizeForSchemeCheck(value: string): string {
    const schemeControlPattern = new RegExp(
      `[${characterRange(0x00, 0x20)}${characterRange(0x7f, 0x9f)}]`,
      'gu',
    );
    let normalized = value.replace(schemeControlPattern, '').toLocaleLowerCase();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const decoded = decodeURIComponent(normalized);
        if (decoded === normalized) break;
        normalized = decoded;
      } catch {
        break;
      }
    }
    return normalized;
  }

  // Do not edit — Control/bidi characters become visible markers, never executable content, so copied canonical text stays verbatim.
  function presentInvisibleCharacters(value: string): {
    readonly value: string;
    readonly changed: boolean;
  } {
    let changed = false;
    const presented = value
      .replace(ANSI_SEQUENCE_PATTERN, (sequence) => {
        changed = true;
        return `␛${sequence.slice(1)}`;
      })
      .replace(BIDI_CONTROL_PATTERN, (control) => {
        changed = true;
        const labels: Readonly<Record<string, string>> = {
          [String.fromCharCode(0x061c)]: '⟦ALM⟧',
          [String.fromCharCode(0x200e)]: '⟦LRM⟧',
          [String.fromCharCode(0x200f)]: '⟦RLM⟧',
          [String.fromCharCode(0x202a)]: '⟦LRE⟧',
          [String.fromCharCode(0x202b)]: '⟦RLE⟧',
          [String.fromCharCode(0x202c)]: '⟦PDF⟧',
          [String.fromCharCode(0x202d)]: '⟦LRO⟧',
          [String.fromCharCode(0x202e)]: '⟦RLO⟧',
          [String.fromCharCode(0x2066)]: '⟦LRI⟧',
          [String.fromCharCode(0x2067)]: '⟦RLI⟧',
          [String.fromCharCode(0x2068)]: '⟦FSI⟧',
          [String.fromCharCode(0x2069)]: '⟦PDI⟧',
        };
        return labels[control] ?? '⟦BIDI⟧';
      })
      .replace(ASCII_CONTROL_PATTERN, (control) => {
        changed = true;
        const code = control.charCodeAt(0);
        return code <= 0x1f
          ? `␀${code.toString(16).toUpperCase()}`
          : `␦${code.toString(16).toUpperCase()}`;
      });
    return { value: presented, changed };
  }

  // Keep character range focused on its single responsibility.
  function characterRange(start: number, end: number): string {
    const first = String.fromCharCode(start);
    return start === end ? first : `${first}-${String.fromCharCode(end)}`;
  }

  // Keep list start focused on its single responsibility.
  function listStart(line: string): { readonly ordered: boolean; readonly text: string } | null {
    const unordered = /^ {0,3}[-+*][ \t]+(.+)$/u.exec(line);
    if (unordered !== null) return { ordered: false, text: unordered[1] ?? '' };
    const ordered = /^ {0,3}\d{1,9}[.)][ \t]+(.+)$/u.exec(line);
    if (ordered !== null) return { ordered: true, text: ordered[1] ?? '' };
    return null;
  }

  // Keep is table header focused on its single responsibility.
  function isTableHeader(lines: readonly string[], index: number): boolean {
    const header = lines[index];
    const separator = lines[index + 1];
    return (
      header !== undefined &&
      separator !== undefined &&
      header.includes('|') &&
      /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u.test(separator)
    );
  }

  // Keep split table row focused on its single responsibility.
  function splitTableRow(line: string): readonly string[] {
    return line
      .trim()
      .replace(/^\|/u, '')
      .replace(/\|$/u, '')
      .split('|')
      .map((cell) => cell.trim());
  }

  // Do not edit — The language allowlist keeps unknown fenced labels unlabeled/plain; the set is frozen.
  function safeLanguageLabel(value: string): string | null {
    const normalized = value.toLocaleLowerCase();
    const allowed = new Set([
      'bash',
      'javascript',
      'typescript',
      'jsx',
      'tsx',
      'json',
      'html',
      'css',
      'markdown',
      'python',
      'go',
      'rust',
      'yaml',
      'sql',
      'diff',
      'ansi',
      'plaintext',
    ]);
    return allowed.has(normalized) ? normalized : null;
  }

  // Keep escape reg exp focused on its single responsibility.
  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }
</script>

<script lang="ts">
  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { findParts } from '../transcript/transcript-find-index.js';
  import { getTranscriptFindContext } from '../transcript/transcript-find-context.svelte.js';
  import { useCopyFeedback } from './use-copy-feedback.svelte.js';

  interface Props {
    source: string;
    class?: string;
    ariaLabel?: string;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { source, class: className = '', ariaLabel = 'Formatted text' }: Props = $props();

  const feedback = useCopyFeedback();
  const find = getTranscriptFindContext();

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const ast = $derived(parseSafeMarkdown(source));
  const classes = $derived(`safe-markdown${className.length > 0 ? ` ${className}` : ''}`);
  const findTerm = $derived(find.term);
  const controlPresentation = $derived.by(() =>
    ast === null ? presentInvisibleCharacters(source) : { value: source, changed: false },
  );
</script>

<!-- Component content -->
{#snippet marked(text: string)}{#each findParts(text, findTerm) as part, partIndex (partIndex)}{#if part.mark}<mark class="artifact-find--match">{part.text}</mark>{:else}{part.text}{/if}{/each}{/snippet}

{#snippet inline(text: string)}{#each renderInlineParts(text) as part, i (i)}{#if part.kind === 'code'}<code>{@render marked(part.text)}</code>{:else if part.kind === 'strong'}<strong>{@render marked(part.text)}</strong>{:else if part.kind === 'em'}<em>{@render marked(part.text)}</em>{:else if part.kind === 'del'}<del>{@render marked(part.text)}</del>{:else if part.kind === 'link'}{#if part.mode === 'external'}<a class="safe-markdown--link" href={part.href} target="_blank" rel="external noopener noreferrer">{@render marked(part.text)}</a>{:else}<span class="safe-markdown--unavailable" title="Link unavailable" aria-disabled="true">{@render marked(part.text)}</span>{/if}{:else}{@render marked(part.text)}{/if}{/each}{/snippet}

{#if ast === null}
  <!-- Do not edit — The fail-closed fallback renders rejected source verbatim and marks the canonical source for exact copying. -->
  <div
    class={`${classes} safe-markdown--fallback`}
    aria-label={ariaLabel}
    dir="auto"
    data-control-presentation={controlPresentation.changed ? 'readonly' : undefined}
    data-verbatim-copy="canonical-source"
  >{#if controlPresentation.changed}<span title="Control characters are shown as visible markers">{controlPresentation.value}</span>{:else}{source}{/if}</div>
{:else}
  <div class={classes} aria-label={ariaLabel} dir="auto">
    {#each ast as node, index (index)}
      {#if node.kind === 'heading'}
        <svelte:element this={`h${node.level}`}>{@render inline(node.text)}</svelte:element>
      {:else if node.kind === 'paragraph'}
        <p>{@render inline(node.text)}</p>
      {:else if node.kind === 'quote'}
        <blockquote>{@render inline(node.text)}</blockquote>
      {:else if node.kind === 'list'}
        {#if node.ordered}
          <ol>{#each node.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}</ol>
        {:else}
          <ul>{#each node.items as item, itemIndex (itemIndex)}<li>{@render inline(item)}</li>{/each}</ul>
        {/if}
      {:else if node.kind === 'table'}
        <table>
          <thead>
            <tr>{#each node.headings as heading, headingIndex (headingIndex)}<th>{@render inline(heading)}</th>{/each}</tr>
          </thead>
          <tbody>
            {#each node.rows as row, rowIndex (rowIndex)}
              <tr>{#each node.headings as heading, columnIndex (`${rowIndex}:${columnIndex}:${heading}`)}<td>{@render inline(row[columnIndex] ?? '')}</td>{/each}</tr>
            {/each}
          </tbody>
        </table>
      {:else if node.kind === 'code'}
        <div class="safe-markdown--fence">
          {#if feedback.canCopy}
            <button
              type="button"
              class="safe-markdown--copy"
              class:is-copied={feedback.copiedUnit === `fence-${index}` && !feedback.copyFailed}
              use:hover
              use:press
              use:focusVisible
              aria-label={feedback.actionLabel('code')}
              onclick={() => feedback.copy(`fence-${index}`, node.source)}
            >{feedback.copiedUnit === `fence-${index}` && !feedback.copyFailed ? 'Copied' : 'Copy'}</button>
          {/if}
          <pre class="safe-markdown--code" data-language={node.language ?? undefined}><code>{node.source}</code></pre>
        </div>
      {/if}
    {/each}
    {#if feedback.canCopy && feedback.announcement.length > 0}
      <p class="safe-markdown--copy-status" role="status" aria-live="polite">{feedback.announcement}</p>
    {/if}
  </div>
{/if}

<style>
  /* This slot: safe-markdown--fallback — the fail-closed verbatim read-out. */
  .safe-markdown--fallback[data-control-presentation='readonly'] {
    border-inline-start: 3px solid var(--accent-strong);
    padding-inline-start: var(--space-3);
    overflow-wrap: anywhere;
  }

  /* This slot: safe-markdown — the safe-Markdown renderer's prose output. */
  /* Do not edit — This is presentation for already-sanitized Markdown; allowlisting and scheme filtering remain in the module script. */
  .safe-markdown,
  .safe-markdown--fallback {
    min-inline-size: 0;
    color: var(--ink);
    font: 1rem/1.55 var(--font-display);
    overflow-wrap: anywhere;
  }

  /* This slot: prose spacing — block-level rhythm for headings and quotes. */
  .safe-markdown p,
  .safe-markdown h1,
  .safe-markdown h2,
  .safe-markdown h3,
  .safe-markdown h4,
  .safe-markdown h5,
  .safe-markdown h6,
  .safe-markdown blockquote {
    margin-block: 0 var(--space-3);
  }

  /* This slot: prose-quote — blockquote border + muted ink. */
  .safe-markdown blockquote {
    padding-inline-start: var(--space-3);
    border-inline-start: 3px solid var(--line-strong);
    color: var(--ink-muted);
  }

  /* This slot: prose-list — ordered/unordered list rhythm and indent. */
  .safe-markdown ul,
  .safe-markdown ol {
    margin-block: 0 var(--space-3);
    padding-inline-start: 1.4rem;
  }

  /* This slot: prose-inline-code — inline code chip. */
  .safe-markdown code {
    padding: 0.1rem 0.25rem;
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
    font-family: var(--font-mono);
    font-size: 0.88em;
  }

  /* This slot: safe-markdown--code — fenced code block rendered by SafeMarkdown. */
  .safe-markdown--code {
    max-inline-size: 100%;
    margin-block: 0 var(--space-3);
    padding: var(--space-3);
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-code);
    color: var(--ink-inverse);
    font: 0.8125rem/1.45 var(--font-mono);
    white-space: pre;
  }

  /* This slot: safe-markdown--code — neutralizes the inline-chip chrome inside a
     fenced block. */
  .safe-markdown--code code {
    padding: 0;
    background: transparent;
  }

  /* This slot: prose-table — table rhythm, borders, and start-aligned cells. */
  .safe-markdown table {
    inline-size: 100%;
    margin-block: 0 var(--space-3);
    border-collapse: collapse;
    font-size: 0.9em;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .safe-markdown th,
  .safe-markdown td {
    padding: var(--space-2);
    border: 1px solid var(--line);
    text-align: start;
    vertical-align: top;
  }

  /* This slot: fence — copy sits above the well so the confirm does not shift the source. */
  .safe-markdown--fence {
    position: relative;
    margin-block: 0 var(--space-3);
  }

  .safe-markdown--fence .safe-markdown--code {
    margin-block: 0;
  }

  .safe-markdown--copy {
    min-inline-size: 44px;
    min-block-size: 44px;
    margin-bottom: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-muted);
    font-size: 0.75rem;
    font-weight: 550;
    cursor: pointer;
  }

  .safe-markdown--copy:global([data-hovered]) {
    background: var(--surface-muted);
    color: var(--ink-secondary);
  }

  .safe-markdown--copy:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .safe-markdown--copy.is-copied {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .safe-markdown--copy-status {
    min-block-size: 1.25rem;
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* http(s) only; path tokens use the unavailable span and never become hrefs. */
  .safe-markdown--link {
    color: var(--accent-ink);
    text-decoration: underline;
  }

  .safe-markdown--unavailable {
    color: var(--ink-muted);
    text-decoration: underline dotted;
    cursor: default;
  }
</style>
