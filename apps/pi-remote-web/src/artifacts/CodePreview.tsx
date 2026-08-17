import { useEffect, useState, type ReactNode } from 'react';

export interface CodePreviewProps {
  readonly text: string;
  readonly language?: string;
  readonly wrap?: boolean;
  readonly findTerm?: string;
  readonly ariaLabel?: string;
  readonly enableHighlighting?: boolean;
}

interface HighlightToken {
  readonly text: string;
  readonly kind: 'plain' | 'keyword' | 'string' | 'comment' | 'number';
}

interface HighlightState {
  readonly source: string;
  readonly tokens: readonly HighlightToken[] | null;
}

const WORKER_SOURCE = `
self.onmessage = function(event) {
  const source = String(event.data || '');
  const pattern = /(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|#[^\\n]*|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\b(?:const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|async|await|true|false|null|undefined)\\b|\\b\\d+(?:\\.\\d+)?\\b)/gu;
  const tokens = [];
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index || 0;
    if (start > cursor) tokens.push({ text: source.slice(cursor, start), kind: 'plain' });
    const value = match[0];
    const kind = value.startsWith('//') || value.startsWith('/*') || value.startsWith('#')
      ? 'comment'
      : value.startsWith('"') || value.startsWith("'")
        ? 'string'
        : /^\\d/u.test(value)
          ? 'number'
          : 'keyword';
    tokens.push({ text: value, kind });
    cursor = start + value.length;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor), kind: 'plain' });
  self.postMessage(tokens);
};
`;

function useLazyHighlight(text: string, enabled: boolean): HighlightState {
  const [state, setState] = useState<HighlightState>({ source: '', tokens: null });
  useEffect(() => {
    setState({ source: text, tokens: null });
    if (!enabled || typeof Worker === 'undefined' || typeof Blob === 'undefined') return undefined;
    let worker: Worker | null = null;
    let objectUrl: string | null = null;
    let disposed = false;
    try {
      objectUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      worker = new Worker(objectUrl);
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (disposed || !Array.isArray(event.data)) return;
        const tokens = event.data.filter(isHighlightToken);
        setState({ source: text, tokens });
      };
      worker.onerror = () => {
        if (!disposed) setState({ source: text, tokens: null });
      };
      worker.postMessage(text);
    } catch {
      if (!disposed) setState({ source: text, tokens: null });
    }
    return () => {
      disposed = true;
      worker?.terminate();
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, text]);
  return state.source === text ? state : { source: text, tokens: null };
}

function isHighlightToken(value: unknown): value is HighlightToken {
  if (typeof value !== 'object' || value === null) return false;
  const token = value as { readonly text?: unknown; readonly kind?: unknown };
  return (
    typeof token.text === 'string' &&
    (token.kind === 'plain' ||
      token.kind === 'keyword' ||
      token.kind === 'string' ||
      token.kind === 'comment' ||
      token.kind === 'number')
  );
}

function renderFindableText(text: string, findTerm: string, keyPrefix: string): ReactNode {
  if (findTerm.trim().length === 0) return text;
  const needle = findTerm.toLocaleLowerCase();
  const source = text.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match = source.indexOf(needle, cursor);
  let index = 0;
  while (match >= 0) {
    if (match > cursor) parts.push(text.slice(cursor, match));
    parts.push(
      <mark className="artifact-find-match" key={keyPrefix + '-' + index}>
        {text.slice(match, match + findTerm.length)}
      </mark>,
    );
    cursor = match + findTerm.length;
    match = source.indexOf(needle, cursor);
    index += 1;
  }
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function renderTokens(tokens: readonly HighlightToken[], findTerm: string): ReactNode {
  return tokens.map((token, index) => (
    <span className={'artifact-code-token is-' + token.kind} key={index}>
      {renderFindableText(token.text, findTerm, 'code-' + index)}
    </span>
  ));
}

export function CodePreview({
  text,
  language,
  wrap = false,
  findTerm = '',
  ariaLabel = 'Code preview',
  enableHighlighting = true,
}: CodePreviewProps) {
  const highlighted = useLazyHighlight(text, enableHighlighting);
  const lines = text.split('\n');
  return (
    <div
      className={`artifact-code-preview${wrap ? ' is-wrapped' : ''}`}
      data-language={language}
      aria-label={ariaLabel}
      dir="ltr"
      data-display-buffer
    >
      <div
        className="artifact-code-gutter"
        aria-hidden="true"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {lines.map((_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <pre className="artifact-code-source">
        <code>
          {highlighted.tokens === null
            ? renderFindableText(text, findTerm, 'code-plain')
            : renderTokens(highlighted.tokens, findTerm)}
        </code>
      </pre>
    </div>
  );
}
