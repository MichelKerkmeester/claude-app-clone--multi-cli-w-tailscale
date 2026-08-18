import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import {
  normalizeHighlightLanguage,
  useHighlightedCode,
  type HighlightToken,
} from '../rich-content/useHighlightedCode.js';

export interface CodePreviewProps {
  readonly text: string;
  readonly language?: string;
  readonly wrap?: boolean;
  readonly findTerm?: string;
  readonly ariaLabel?: string;
  readonly enableHighlighting?: boolean;
  readonly revision?: string | number;
  readonly followTail?: boolean;
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
  revision = 1,
  followTail = false,
}: CodePreviewProps) {
  // @ds surface: code-preview — the highlighted code well, gutter, and live-edge follow.
  // @ds state: highlight (plain → pending → highlighted) via [data-highlight-status]; follow-tail
  //   live-edge via [data-live-edge] and the Jump to latest control.
  // @ds guardrail: do-not-edit — the highlight worker (useHighlightedCode) and the scroll/follow
  //   live-edge logic are frozen; tokens render as inert <span> text only.
  const safeLanguage = normalizeHighlightLanguage(language);
  const highlighted = useHighlightedCode({
    source: text,
    language: safeLanguage,
    revision,
    enabled: enableHighlighting,
  });
  const lines = text.split('\n');
  const scrollRef = useRef<HTMLDivElement>(null);
  const atLiveEdgeRef = useRef(true);
  const [atLiveEdge, setAtLiveEdge] = useState(true);
  const updateLiveEdge = () => {
    const scroll = scrollRef.current;
    if (scroll === null) return;
    const nextAtLiveEdge = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= 96;
    atLiveEdgeRef.current = nextAtLiveEdge;
    setAtLiveEdge((current) => (current === nextAtLiveEdge ? current : nextAtLiveEdge));
  };
  const jumpToLatest = () => {
    const scroll = scrollRef.current;
    if (scroll === null) return;
    scroll.scrollTop = scroll.scrollHeight;
    atLiveEdgeRef.current = true;
    setAtLiveEdge(true);
  };
  useLayoutEffect(() => {
    if (!followTail || !atLiveEdgeRef.current) return;
    const scroll = scrollRef.current;
    if (scroll !== null) scroll.scrollTop = scroll.scrollHeight;
  }, [followTail, revision, text]);
  useLayoutEffect(() => {
    if (!followTail) {
      atLiveEdgeRef.current = true;
      setAtLiveEdge(true);
    }
  }, [followTail]);
  return (
    <div className="artifact-code-viewer" data-live-edge={followTail ? atLiveEdge : undefined}>
      <div
        className={`artifact-code-preview${wrap ? ' is-wrapped' : ''}`}
        ref={scrollRef}
        data-language={safeLanguage ?? 'plaintext'}
        data-highlight-status={highlighted.status}
        data-revision={highlighted.revisionId}
        aria-label={ariaLabel}
        dir="ltr"
        data-display-buffer
        onScroll={followTail ? updateLiveEdge : undefined}
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
      {followTail && !atLiveEdge && (
        <button type="button" className="artifact-jump-latest" onClick={jumpToLatest}>
          Jump to latest
        </button>
      )}
    </div>
  );
}
