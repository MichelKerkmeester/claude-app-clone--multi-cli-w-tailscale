import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

export interface DiffPreviewProps extends Pick<FileDiffBlock, 'patch'> {
  readonly wrap?: boolean;
  readonly findTerm?: string;
}

export function DiffPreview({ patch, wrap = false, findTerm = '' }: DiffPreviewProps) {
  // @ds surface: diff-preview — the unified-diff read well.
  // @ds state: add · remove · context · find-match — per-line classes drive the tint.
  const lines = patch.split('\n');
  return (
    <pre
      className={`artifact-diff-preview${wrap ? ' is-wrapped' : ''}`}
      aria-label="Redacted file diff"
      dir="ltr"
      data-display-buffer
    >
      {lines.map((line, index) => (
        <span
          className={`${
            line.startsWith('+')
              ? 'artifact-diff-line artifact-diff-add'
              : line.startsWith('-')
                ? 'artifact-diff-line artifact-diff-remove'
                : 'artifact-diff-line artifact-diff-context'
          }${findTerm.length > 0 && line.toLocaleLowerCase().includes(findTerm.toLocaleLowerCase()) ? ' is-find-match' : ''}`}
          key={`${index}-${line.slice(0, 12)}`}
        >
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  );
}
