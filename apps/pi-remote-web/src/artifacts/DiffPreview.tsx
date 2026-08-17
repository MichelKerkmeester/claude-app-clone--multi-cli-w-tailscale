import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

export function DiffPreview({ patch }: Pick<FileDiffBlock, 'patch'>) {
  const lines = patch.split('\n');
  return (
    <pre className="artifact-diff-preview" aria-label="Redacted file diff">
      {lines.map((line, index) => (
        <span
          className={
            line.startsWith('+')
              ? 'artifact-diff-line artifact-diff-add'
              : line.startsWith('-')
                ? 'artifact-diff-line artifact-diff-remove'
                : 'artifact-diff-line artifact-diff-context'
          }
          key={`${index}-${line.slice(0, 12)}`}
        >
          {line}
          {index < lines.length - 1 ? '\n' : ''}
        </span>
      ))}
    </pre>
  );
}
