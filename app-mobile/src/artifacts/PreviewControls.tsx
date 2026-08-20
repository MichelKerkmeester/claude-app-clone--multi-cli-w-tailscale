export interface PreviewControlsProps {
  readonly kind: 'diff' | 'text' | 'markdown' | 'code' | 'image';
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
  readonly zoom?: number;
  readonly onZoomOut?: () => void;
  readonly onFit?: () => void;
  readonly onZoomIn?: () => void;
  readonly onPan?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  readonly onDetails?: () => void;
  readonly detailsOpen?: boolean;
}

const KIND_LABELS: Record<PreviewControlsProps['kind'], string> = {
  diff: 'Diff',
  text: 'Text',
  markdown: 'Markdown',
  code: 'Code',
  image: 'Image',
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
  zoom = 1,
  onZoomOut,
  onFit,
  onZoomIn,
  onPan,
  onDetails,
  detailsOpen = false,
}: PreviewControlsProps) {
  // @ds surface: preview-controls — the per-kind toolbar (find · wrap · zoom · pan · copy · share).
  // @ds state: kind (diff · text · markdown · code · image) decides which controls render.
  // @ds guardrail: do-not-edit — the toolbar role=group and each aria-label/aria-pressed are frozen.
  return (
    <div className="artifact-preview-controls" role="group" aria-label="Preview controls">
      <span>{KIND_LABELS[kind]}</span>
      <span>{readOnly ? 'Read-only' : 'Preview'}</span>
      {kind === 'image' && (
        <>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          {onZoomOut !== undefined && (
            <button
              type="button"
              className="artifact-control-button"
              aria-label="Zoom out"
              onClick={onZoomOut}
            >
              −
            </button>
          )}
          {onFit !== undefined && (
            <button
              type="button"
              className="artifact-control-button"
              aria-pressed={zoom === 1}
              onClick={onFit}
            >
              Fit
            </button>
          )}
          {onZoomIn !== undefined && (
            <button
              type="button"
              className="artifact-control-button"
              aria-label="Zoom in"
              onClick={onZoomIn}
            >
              +
            </button>
          )}
          {onPan !== undefined && (
            <span className="artifact-image-pan-controls" role="group" aria-label="Pan image">
              {(['up', 'left', 'right', 'down'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className="artifact-control-button"
                  aria-label={`Pan ${direction}`}
                  onClick={() => onPan(direction)}
                >
                  {direction === 'up'
                    ? '↑'
                    : direction === 'down'
                      ? '↓'
                      : direction === 'left'
                        ? '←'
                        : '→'}
                </button>
              ))}
            </span>
          )}
          {onDetails !== undefined && (
            <button
              type="button"
              className="artifact-control-button"
              aria-expanded={detailsOpen}
              aria-controls="artifact-details"
              onClick={onDetails}
            >
              Details
            </button>
          )}
        </>
      )}
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
      {kind !== 'image' && canCopy && onCopy !== undefined && (
        <button type="button" className="artifact-control-button" onClick={onCopy}>
          {copyLabel}
        </button>
      )}
      {kind !== 'image' && canShare && onShare !== undefined && (
        <button type="button" className="artifact-control-button" onClick={onShare}>
          Share
        </button>
      )}
    </div>
  );
}
