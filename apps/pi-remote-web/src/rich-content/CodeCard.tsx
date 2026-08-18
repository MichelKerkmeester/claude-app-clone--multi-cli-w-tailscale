import { useRef, type ReactNode } from 'react';
import { Button } from 'react-aria-components';

import type { NormalizedCodeBlock } from './normalizeTranscriptBlocks.js';
import { RichBlockFrame } from './RichBlockFrame.js';
import { useCopyFeedback } from './useCopyFeedback.js';
import { useHighlightedCode, type HighlightToken } from './useHighlightedCode.js';

// @ds surface: code-card — fenced source preview with optional progressive
// highlighting and a full-screen Open handoff. Presentation lives in
// src/style.css under the same surface name; the highlight lifecycle + react-aria
// wiring below is guardrailed and not designer-editable.

// @ds guardrail: do-not-edit — useHighlightedCode drives the highlight worker +
// lifecycle (plain → pending → highlighted) and owns its own cancellation and
// failure/fallback path. Plaintext-first: a card always renders the raw source
// whether or not highlighting succeeds. Not designer-editable.
export interface CodeCardProps {
  readonly block: NormalizedCodeBlock;
  readonly onOpen?: (trigger?: HTMLButtonElement | null) => void;
}

const PREVIEW_LINES = 12;

export function CodeCard({ block, onOpen }: CodeCardProps) {
  // @ds guardrail: do-not-edit — exact-copy clipboard boundary (useCopyFeedback)
  // and the highlight worker/lifecycle. Not designer-editable.
  const feedback = useCopyFeedback();
  const lines = displayLines(block.canonicalSource);
  const preview = lines.slice(0, PREVIEW_LINES).join('\n');
  const canOpen = block.canonicalSource.length > 0 && onOpen !== undefined;
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const highlighted = useHighlightedCode({
    source: block.canonicalSource,
    language: block.language,
    revision: block.revision,
  });
  const previewTokens =
    highlighted.tokens === null ? null : clipTokens(highlighted.tokens, preview.length);
  return (
    <RichBlockFrame
      title={block.languageLabel}
      eyebrow="Code"
      metadata={[
        `${lines.length} lines`,
        block.incomplete
          ? 'Incomplete fence'
          : highlighted.status === 'highlighted'
            ? 'Highlighted'
            : 'Plain text',
      ]}
      redaction={block.redaction}
      className="rich-code-card"
      actions={
        // @ds slot: actions — Copy source + full-screen Open handoff.
        // @ds guardrail: do-not-edit — react-aria Button wiring and the exact-copy
        // clipboard boundary; Open is a pass-through with no fetch/endpoint/ticket/
        // download/host-file read.
        feedback.canCopy || canOpen ? (
          <>
            {feedback.canCopy && (
              <Button
                className="rich-block-action"
                aria-label={feedback.actionLabel('code')}
                onPress={() => feedback.copy('code', block.canonicalSource)}
              >
                {feedback.actionLabel('code')}
              </Button>
            )}
            {canOpen && (
              <Button
                ref={openButtonRef}
                className="rich-block-action"
                onPress={() => onOpen?.(openButtonRef.current)}
              >
                Open full screen
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {/* @ds slot: code-preview — horizontally panning viewport; code scrolls
          inside its own box and never overflows the page. */}
      <div className="rich-code-preview" data-code-pan="true">
        {/* @ds state: code — plaintext-first; React writes data-highlight-status
            (plain · pending · highlighted) as the worker progresses.
            @ds guardrail: do-not-edit — the status attribute and token rendering
            are behaviour owned by the highlight lifecycle. */}
        <pre aria-label={`${block.languageLabel} code preview`}>
          <code data-highlight-status={highlighted.status}>
            {previewTokens === null ? preview : renderTokens(previewTokens)}
          </code>
        </pre>
      </div>
      {lines.length > PREVIEW_LINES && (
        <p className="rich-continuation">{lines.length - PREVIEW_LINES} more lines</p>
      )}
      {/* @ds guardrail: do-not-edit — polite live region announcing Copy outcomes. */}
      <p className="rich-copy-status" role="status" aria-live="polite">
        {feedback.announcement}
      </p>
    </RichBlockFrame>
  );
}

function displayLines(value: string): string[] {
  const lines = value.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function clipTokens(tokens: readonly HighlightToken[], length: number): readonly HighlightToken[] {
  if (length <= 0) return [];
  const clipped: HighlightToken[] = [];
  let remaining = length;
  for (const token of tokens) {
    if (remaining <= 0) break;
    const text = token.text.slice(0, remaining);
    if (text.length > 0) clipped.push({ ...token, text });
    remaining -= text.length;
  }
  return clipped;
}

function renderTokens(tokens: readonly HighlightToken[]): ReactNode {
  return tokens.map((token, index) => (
    <span className={`rich-code-token is-${token.kind}`} key={index}>
      {token.text}
    </span>
  ));
}
