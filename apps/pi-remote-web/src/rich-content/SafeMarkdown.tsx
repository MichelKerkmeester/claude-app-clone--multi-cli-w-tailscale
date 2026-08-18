import { createElement, type ElementType, type ReactNode } from 'react';

// @ds surface: safe-markdown — renders already-redacted Markdown to safe prose.
// @ds guardrail: do-not-edit — this module is the read-only sanitization
// boundary. The allowlist, URL/scheme filtering, and character escaping below
// are frozen and NOT designer-editable; the exact-copy affordance in the cards
// and the data-verbatim-copy seam depend on the canonical source staying
// unaltered.

// @ds guardrail: do-not-edit — the sanitization patterns. Raw HTML/markup,
// unsafe URL schemes, and control/bidi characters are matched and rejected
// verbatim; do not add, remove, or broaden any pattern here.
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

export interface SafeMarkdownProps {
  readonly source: string;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export function SafeMarkdown({
  source,
  className = '',
  ariaLabel = 'Formatted text',
}: SafeMarkdownProps) {
  const ast = parseSafeMarkdown(source);
  const classes = `safe-markdown${className.length > 0 ? ` ${className}` : ''}`;
  if (ast === null) {
    const controlPresentation = presentInvisibleCharacters(source);
    // @ds guardrail: do-not-edit — the fail-closed fallback. If the AST boundary
    // rejects the source it renders verbatim (escaping only control characters),
    // and data-verbatim-copy marks the canonical source as the exact-copy text.
    return (
      <div
        className={`${classes} safe-markdown-fallback`}
        aria-label={ariaLabel}
        dir="auto"
        data-control-presentation={controlPresentation.changed ? 'readonly' : undefined}
        data-verbatim-copy="canonical-source"
      >
        {controlPresentation.changed ? (
          <span title="Control characters are shown as visible markers">
            {controlPresentation.value}
          </span>
        ) : (
          source
        )}
      </div>
    );
  }
  return (
    <div className={classes} aria-label={ariaLabel} dir="auto">
      {ast.map((node, index) => renderNode(node, index))}
    </div>
  );
}

// @ds guardrail: do-not-edit — parseSafeMarkdown is the fail-closed AST boundary:
// on any unsafe input it returns null and SafeMarkdown falls back to escaped
// verbatim text. It is exported so security tests verify that boundary.
// The parser is exported so security tests can verify the fail-closed AST boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function parseSafeMarkdown(source: string): readonly SafeMarkdownNode[] | null {
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

function renderNode(node: SafeMarkdownNode, key: number): ReactNode {
  switch (node.kind) {
    case 'heading': {
      return createElement(
        `h${node.level}` as ElementType,
        { key },
        renderInline(node.text, `${key}-heading`),
      );
    }
    case 'paragraph':
      return <p key={key}>{renderInline(node.text, `${key}-paragraph`)}</p>;
    case 'quote':
      return <blockquote key={key}>{renderInline(node.text, `${key}-quote`)}</blockquote>;
    case 'list': {
      const Tag = node.ordered ? 'ol' : 'ul';
      return createElement(
        Tag,
        { key },
        node.items.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item, `${key}-item-${index}`)}</li>
        )),
      );
    }
    case 'table':
      return (
        <table key={key}>
          <thead>
            <tr>
              {node.headings.map((heading, index) => (
                <th key={`${key}-heading-${index}`}>
                  {renderInline(heading, `${key}-th-${index}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((row, rowIndex) => (
              <tr key={`${key}-row-${rowIndex}`}>
                {node.headings.map((_, columnIndex) => (
                  <td key={`${key}-${rowIndex}-${columnIndex}`}>
                    {renderInline(row[columnIndex] ?? '', `${key}-td-${rowIndex}-${columnIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'code':
      return (
        <pre key={key} className="safe-markdown-code" data-language={node.language ?? undefined}>
          <code>{node.source}</code>
        </pre>
      );
  }
}

// @ds guardrail: do-not-edit — inline rendering interprets only the fixed inline
// tokenPattern (code, strong, em, del, links); every other run renders as plain
// text and every link destination is scheme-filtered before it is emitted.
function renderInline(source: string, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = [];
  let remaining = source;
  let index = 0;
  const tokenPattern =
    /(`[^`\n]*`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|!?\[[^\]\n]+\]\([^)\n]+\))/u;
  while (remaining.length > 0) {
    const match = tokenPattern.exec(remaining);
    if (match === null) {
      nodes.push(remaining);
      break;
    }
    const start = match.index;
    if (start > 0) nodes.push(remaining.slice(0, start));
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-code-${index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={`${keyPrefix}-strong-${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={`${keyPrefix}-del-${index}`}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={`${keyPrefix}-em-${index}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('![')) {
      const alt = token.slice(2, token.indexOf(']'));
      nodes.push(alt);
    } else {
      const labelEnd = token.indexOf(']');
      nodes.push(token.slice(1, labelEnd));
    }
    remaining = remaining.slice(start + token.length);
    index += 1;
  }
  return nodes;
}

// @ds guardrail: do-not-edit — the sanitization gate: raw HTML/markup rejection,
// control-character rejection, and unsafe-scheme rejection of every Markdown
// destination. The allowlist and scheme filtering are frozen.
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

// @ds guardrail: do-not-edit — normalizes a destination for the unsafe-scheme
// check (strips control characters and decodes percent-encoding before matching).
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

// @ds guardrail: do-not-edit — control/bidi characters are shown as visible
// markers (never executed) so the copied canonical text stays verbatim.
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
        '\u061c': '⟦ALM⟧',
        '\u200e': '⟦LRM⟧',
        '\u200f': '⟦RLM⟧',
        '\u202a': '⟦LRE⟧',
        '\u202b': '⟦RLE⟧',
        '\u202c': '⟦PDF⟧',
        '\u202d': '⟦LRO⟧',
        '\u202e': '⟦RLO⟧',
        '\u2066': '⟦LRI⟧',
        '\u2067': '⟦RLI⟧',
        '\u2068': '⟦FSI⟧',
        '\u2069': '⟦PDI⟧',
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

function characterRange(start: number, end: number): string {
  const first = String.fromCharCode(start);
  return start === end ? first : `${first}-${String.fromCharCode(end)}`;
}

function listStart(line: string): { readonly ordered: boolean; readonly text: string } | null {
  const unordered = /^ {0,3}[-+*][ \t]+(.+)$/u.exec(line);
  if (unordered !== null) return { ordered: false, text: unordered[1] ?? '' };
  const ordered = /^ {0,3}\d{1,9}[.)][ \t]+(.+)$/u.exec(line);
  if (ordered !== null) return { ordered: true, text: ordered[1] ?? '' };
  return null;
}

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

function splitTableRow(line: string): readonly string[] {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim());
}

// @ds guardrail: do-not-edit — the language allowlist. Any fenced language label
// outside this set renders unlabeled/plain; the set is frozen.
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
