import type { ReactNode } from 'react';

const TEXT_CHUNK_SIZE = 8_192;

export interface TextPreviewProps {
  readonly text: string;
  readonly ariaLabel?: string;
  readonly wrap?: boolean;
  readonly findTerm?: string;
}

function chunkText(text: string): readonly string[] {
  if (text.length <= TEXT_CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  for (let offset = 0; offset < text.length; offset += TEXT_CHUNK_SIZE) {
    chunks.push(text.slice(offset, offset + TEXT_CHUNK_SIZE));
  }
  return chunks;
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

export function TextPreview({
  text,
  ariaLabel = 'Text preview',
  wrap = false,
  findTerm = '',
}: TextPreviewProps) {
  if (text.length === 0) {
    return <p className="artifact-empty-preview">This preview is empty.</p>;
  }
  if (text.trim().length === 0) {
    return <p className="artifact-empty-preview">This preview contains whitespace only.</p>;
  }
  return (
    <div
      className={`artifact-text-preview${wrap ? ' is-wrapped' : ''}`}
      aria-label={ariaLabel}
      dir="auto"
      data-display-buffer
    >
      {chunkText(text).map((chunk, index) => (
        <span className="artifact-text-chunk" data-text-chunk={index} key={index}>
          {renderFindableText(chunk, findTerm, 'text-' + index)}
        </span>
      ))}
    </div>
  );
}
