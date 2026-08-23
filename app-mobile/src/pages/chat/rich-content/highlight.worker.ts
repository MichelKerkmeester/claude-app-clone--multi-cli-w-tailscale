// ───────────────────────────────────────────────────────────────────
// 1. SUPPORTED LANGUAGES AND TOKEN TYPES
// ───────────────────────────────────────────────────────────────────

export const HIGHLIGHT_LANGUAGES = [
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
] as const;

type HighlightLanguage = (typeof HIGHLIGHT_LANGUAGES)[number];
type HighlightTheme = 'light' | 'dark';

export type HighlightTokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'boolean'
  | 'tag'
  | 'heading'
  | 'diff-add'
  | 'diff-remove'
  | 'ansi';

export interface HighlightToken {
  readonly text: string;
  readonly kind: HighlightTokenKind;
}

export interface HighlightRequest {
  readonly source: string;
  readonly language: HighlightLanguage;
  readonly theme: HighlightTheme;
  readonly contentHash: string;
  readonly requestId: string;
  readonly revisionId: string;
}

export interface HighlightResponse {
  readonly tokens: readonly HighlightToken[];
  readonly contentHash: string;
  readonly requestId: string;
  readonly revisionId: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. KEYWORD TABLES
// ───────────────────────────────────────────────────────────────────

const KEYWORDS: Readonly<Record<HighlightLanguage, ReadonlySet<string>>> = {
  bash: new Set([
    'case',
    'do',
    'done',
    'elif',
    'else',
    'esac',
    'fi',
    'for',
    'function',
    'if',
    'in',
    'select',
    'then',
    'until',
    'while',
  ]),
  javascript: new Set([
    'async',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'of',
    'return',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]),
  typescript: new Set([
    'as',
    'async',
    'await',
    'boolean',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'declare',
    'default',
    'delete',
    'else',
    'enum',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'infer',
    'interface',
    'keyof',
    'let',
    'namespace',
    'never',
    'new',
    'null',
    'number',
    'object',
    'of',
    'private',
    'protected',
    'public',
    'readonly',
    'return',
    'satisfies',
    'static',
    'string',
    'switch',
    'this',
    'throw',
    'type',
    'typeof',
    'undefined',
    'unknown',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]),
  jsx: new Set([
    'const',
    'function',
    'import',
    'export',
    'return',
    'if',
    'else',
    'class',
    'async',
    'await',
  ]),
  tsx: new Set([
    'const',
    'function',
    'import',
    'export',
    'return',
    'if',
    'else',
    'class',
    'type',
    'interface',
    'async',
    'await',
  ]),
  json: new Set(['true', 'false', 'null']),
  html: new Set([]),
  css: new Set(['and', 'from', 'important', 'not', 'or', 'to']),
  markdown: new Set([]),
  python: new Set([
    'and',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'nonlocal',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield',
  ]),
  go: new Set([
    'break',
    'case',
    'chan',
    'const',
    'continue',
    'default',
    'defer',
    'else',
    'fallthrough',
    'for',
    'func',
    'go',
    'goto',
    'if',
    'import',
    'interface',
    'map',
    'package',
    'range',
    'return',
    'select',
    'struct',
    'switch',
    'type',
    'var',
  ]),
  rust: new Set([
    'as',
    'async',
    'await',
    'break',
    'const',
    'continue',
    'crate',
    'else',
    'enum',
    'extern',
    'fn',
    'for',
    'if',
    'impl',
    'in',
    'let',
    'loop',
    'match',
    'mod',
    'move',
    'mut',
    'pub',
    'ref',
    'return',
    'self',
    ' Self',
    'static',
    'struct',
    'trait',
    'type',
    'unsafe',
    'use',
    'where',
    'while',
  ]),
  yaml: new Set(['false', 'null', 'true']),
  sql: new Set([
    'alter',
    'and',
    'as',
    'asc',
    'begin',
    'by',
    'case',
    'commit',
    'create',
    'delete',
    'desc',
    'drop',
    'else',
    'end',
    'from',
    'group',
    'having',
    'insert',
    'into',
    'join',
    'left',
    'like',
    'limit',
    'not',
    'null',
    'on',
    'or',
    'order',
    'rollback',
    'select',
    'set',
    'table',
    'then',
    'union',
    'update',
    'values',
    'when',
    'where',
  ]),
  diff: new Set([]),
  ansi: new Set([]),
  plaintext: new Set([]),
};

// ───────────────────────────────────────────────────────────────────
// 3. TOKENIZER PATTERNS
// ───────────────────────────────────────────────────────────────────

const ANSI_ESCAPE = String.fromCharCode(0x1b);
const ANSI_SEQUENCE_PATTERN = new RegExp(String.raw`${ANSI_ESCAPE}\[[0-?]*[ -/]*[@-~]`, 'gu');
const TOKEN_PATTERN = new RegExp(
  String.raw`${ANSI_ESCAPE}\[[0-?]*[ -/]*[@-~]|<\/?[A-Za-z][^>\n]*>|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\/\/[^\n]*|--[^\n]*|#[^\n]*|\`(?:\\.|[^\`\\])*\`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$-]*\b`,
  'gu',
);
const DIFF_LINE_PATTERN = /^(\+{1,3}|-{1,3})(?!\1)/u;
const ANSI_PATTERN = new RegExp(String.raw`^${ANSI_ESCAPE}\[`, 'u');

// ───────────────────────────────────────────────────────────────────
// 4. TOKENIZATION
// ───────────────────────────────────────────────────────────────────

export function tokenizeSource(
  source: string,
  language: HighlightLanguage,
): readonly HighlightToken[] {
  if (language === 'plaintext' || language === 'ansi') {
    return language === 'ansi' ? tokenizeAnsi(source) : [{ text: source, kind: 'plain' }];
  }
  if (language === 'diff') return tokenizeDiff(source);

  const tokens: HighlightToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? cursor;
    if (start > cursor) appendToken(tokens, source.slice(cursor, start), 'plain');
    const value = match[0] ?? '';
    appendToken(tokens, value, classifyToken(value, language));
    cursor = start + value.length;
  }
  if (cursor < source.length) appendToken(tokens, source.slice(cursor), 'plain');
  return tokens.length === 0 ? [{ text: source, kind: 'plain' }] : tokens;
}

function tokenizeAnsi(source: string): readonly HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(ANSI_SEQUENCE_PATTERN)) {
    const start = match.index ?? cursor;
    if (start > cursor) appendToken(tokens, source.slice(cursor, start), 'plain');
    appendToken(tokens, match[0] ?? '', 'ansi');
    cursor = start + (match[0]?.length ?? 0);
  }
  if (cursor < source.length) appendToken(tokens, source.slice(cursor), 'plain');
  return tokens.length === 0 ? [{ text: source, kind: 'plain' }] : tokens;
}

function tokenizeDiff(source: string): readonly HighlightToken[] {
  const tokens: HighlightToken[] = [];
  for (const line of source.split(/(\n)/u)) {
    if (line === '\n') {
      appendToken(tokens, line, 'plain');
      continue;
    }
    const kind = DIFF_LINE_PATTERN.test(line)
      ? line.startsWith('+')
        ? 'diff-add'
        : 'diff-remove'
      : 'plain';
    appendToken(tokens, line, kind);
  }
  return tokens.length === 0 ? [{ text: source, kind: 'plain' }] : tokens;
}

// ───────────────────────────────────────────────────────────────────
// 5. TOKEN CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

function classifyToken(value: string, language: HighlightLanguage): HighlightTokenKind {
  if (ANSI_PATTERN.test(value)) return 'ansi';
  if (
    value.startsWith('//') ||
    value.startsWith('/*') ||
    value.startsWith('#') ||
    value.startsWith('--') ||
    value.startsWith('<!--')
  ) {
    if (language === 'markdown' && /^#{1,6}\s/u.test(value)) return 'heading';
    return 'comment';
  }
  if (value.startsWith('<')) return 'tag';
  if (value.startsWith('`') || value.startsWith('"') || value.startsWith("'")) return 'string';
  if (/^\d/u.test(value)) return 'number';
  if (value === 'true' || value === 'false' || value === 'null' || value === 'undefined') {
    return 'boolean';
  }
  if (KEYWORDS[language]?.has(value) === true) return 'keyword';
  return 'plain';
}

function appendToken(tokens: HighlightToken[], text: string, kind: HighlightTokenKind): void {
  if (text.length === 0) return;
  const previous = tokens.at(-1);
  if (previous?.kind === kind) {
    tokens[tokens.length - 1] = { text: previous.text + text, kind };
    return;
  }
  tokens.push({ text, kind });
}

// ───────────────────────────────────────────────────────────────────
// 6. MESSAGE VALIDATION
// ───────────────────────────────────────────────────────────────────

interface WorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (message: HighlightResponse) => void;
}

function isLanguage(value: unknown): value is HighlightLanguage {
  return typeof value === 'string' && (HIGHLIGHT_LANGUAGES as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is HighlightTheme {
  return value === 'light' || value === 'dark';
}

function isRequest(value: unknown): value is HighlightRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<HighlightRequest>;
  return (
    typeof candidate.source === 'string' &&
    isLanguage(candidate.language) &&
    isTheme(candidate.theme) &&
    typeof candidate.contentHash === 'string' &&
    typeof candidate.requestId === 'string' &&
    typeof candidate.revisionId === 'string'
  );
}

// ───────────────────────────────────────────────────────────────────
// 7. WORKER MESSAGE HANDLER
// ───────────────────────────────────────────────────────────────────

const workerScope = globalThis as unknown as WorkerScope;
workerScope.onmessage = (event) => {
  if (!isRequest(event.data)) return;
  const response: HighlightResponse = {
    tokens: tokenizeSource(event.data.source, event.data.language),
    contentHash: event.data.contentHash,
    requestId: event.data.requestId,
    revisionId: event.data.revisionId,
  };
  workerScope.postMessage(response);
};
