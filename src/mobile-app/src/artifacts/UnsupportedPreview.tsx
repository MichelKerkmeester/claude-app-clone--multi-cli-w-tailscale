export interface UnsupportedPreviewProps {
  readonly renderer?: string;
  readonly message?: string;
}

export function UnsupportedPreview({
  renderer = 'this file type',
  message,
}: UnsupportedPreviewProps) {
  // @ds surface: unsupported-preview — the unavailable/unsupported read notice.
  // @ds state: unsupported · withheld · denied · missing · corrupt · too-large · … — the caller
  //   passes the message; this renders the notice.
  return (
    <div className="artifact-unsupported-preview">
      <strong>Preview unavailable</strong>
      <p>{message ?? `${renderer} previews are not available in this reader.`}</p>
    </div>
  );
}
