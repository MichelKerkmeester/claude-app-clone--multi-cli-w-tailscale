export interface PreviewControlsProps {
  readonly kind: 'diff';
  readonly readOnly?: boolean;
}

export function PreviewControls({ kind, readOnly = true }: PreviewControlsProps) {
  return (
    <div className="artifact-preview-controls" role="group" aria-label="Preview controls">
      <span>{kind === 'diff' ? 'Diff' : 'Preview'}</span>
      <span>{readOnly ? 'Read-only' : 'Preview'}</span>
    </div>
  );
}
