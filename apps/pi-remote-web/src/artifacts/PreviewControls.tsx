export interface PreviewControlsProps {
  readonly kind: 'diff' | 'text' | 'markdown' | 'code';
  readonly readOnly?: boolean;
  readonly wrap?: boolean;
  readonly onWrapChange?: (wrap: boolean) => void;
  readonly findTerm?: string;
  readonly onFindTermChange?: (term: string) => void;
  readonly canCopy?: boolean;
  readonly canShare?: boolean;
  readonly onCopy?: () => void;
  readonly onShare?: () => void;
  readonly copyLabel?: string;
}

const KIND_LABELS: Record<PreviewControlsProps['kind'], string> = {
  diff: 'Diff',
  text: 'Text',
  markdown: 'Markdown',
  code: 'Code',
};

export function PreviewControls({
  kind,
  readOnly = true,
  wrap = false,
  onWrapChange,
  findTerm = '',
  onFindTermChange,
  canCopy = false,
  canShare = false,
  onCopy,
  onShare,
  copyLabel = 'Copy',
}: PreviewControlsProps) {
  return (
    <div className="artifact-preview-controls" role="group" aria-label="Preview controls">
      <span>{KIND_LABELS[kind]}</span>
      <span>{readOnly ? 'Read-only' : 'Preview'}</span>
      {onWrapChange !== undefined && (
        <button
          type="button"
          className="artifact-control-button"
          aria-pressed={wrap}
          onClick={() => onWrapChange(!wrap)}
        >
          {wrap ? 'Unwrap' : 'Wrap'}
        </button>
      )}
      {onFindTermChange !== undefined && (
        <label className="artifact-find-control">
          <span>Find</span>
          <input
            type="search"
            value={findTerm}
            onChange={(event) => onFindTermChange(event.currentTarget.value)}
            aria-label={`Find in ${KIND_LABELS[kind].toLocaleLowerCase()}`}
            inputMode="search"
          />
        </label>
      )}
      {canCopy && onCopy !== undefined && (
        <button type="button" className="artifact-control-button" onClick={onCopy}>
          {copyLabel}
        </button>
      )}
      {canShare && onShare !== undefined && (
        <button type="button" className="artifact-control-button" onClick={onShare}>
          Share
        </button>
      )}
    </div>
  );
}
