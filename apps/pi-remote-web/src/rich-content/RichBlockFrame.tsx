import type { ReactNode } from 'react';

import { RedactionBadge } from './RedactionBadge.js';

// @ds surface: rich-block-frame — shared chrome for every rich card: header
// (eyebrow · title · metadata · status · redaction), content column, and a
// footer action row. The matching presentation blocks live in src/style.css
// under the same surface name. A designer may edit markup between the @ds slot
// seams below and nothing else.

export interface RichBlockFrameProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly metadata?: readonly string[];
  readonly status?: string;
  readonly redaction?: Parameters<typeof RedactionBadge>[0]['redaction'];
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RichBlockFrame({
  title,
  eyebrow,
  metadata = [],
  status,
  redaction = null,
  actions,
  children,
  className = '',
}: RichBlockFrameProps) {
  return (
    <article className={`rich-block-frame${className.length > 0 ? ` ${className}` : ''}`}>
      {/* @ds slot: header — eyebrow · title · metadata against status · redaction. */}
      <header className="rich-block-header">
        {/* @ds slot: heading — eyebrow + title + metadata column. */}
        <div className="rich-block-heading">
          {eyebrow !== undefined && <p className="rich-block-eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
          {/* @ds slot: metadata — factual chips; the map wiring is guardrailed. */}
          {metadata.length > 0 && (
            <div className="rich-block-metadata">
              {/* @ds guardrail: do-not-edit — metadata is derived data mapped to
                  chips; a designer edits the chip list here only if it stays a
                  bounded derived read-out. */}
              {metadata.map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
          )}
        </div>
        {/* @ds slot: status — lifecycle caption + redaction badge. */}
        <div className="rich-block-status">
          {status !== undefined && <span>{status}</span>}
          {/* @ds guardrail: do-not-edit — RedactionBadge marks already-redacted,
              read-only content; never remove it from the frame. */}
          <RedactionBadge redaction={redaction} />
        </div>
      </header>
      {/* @ds slot: content — the per-card preview region. */}
      <div className="rich-block-content">{children}</div>
      {/* @ds slot: actions — footer row of Copy / Open unit actions. */}
      {actions !== undefined && <footer className="rich-block-actions">{actions}</footer>}
    </article>
  );
}
