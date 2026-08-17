import type { ReactNode } from 'react';

import { RedactionBadge } from './RedactionBadge.js';

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
      <header className="rich-block-header">
        <div className="rich-block-heading">
          {eyebrow !== undefined && <p className="rich-block-eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
          {metadata.length > 0 && (
            <div className="rich-block-metadata">
              {metadata.map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
          )}
        </div>
        <div className="rich-block-status">
          {status !== undefined && <span>{status}</span>}
          <RedactionBadge redaction={redaction} />
        </div>
      </header>
      <div className="rich-block-content">{children}</div>
      {actions !== undefined && <footer className="rich-block-actions">{actions}</footer>}
    </article>
  );
}
