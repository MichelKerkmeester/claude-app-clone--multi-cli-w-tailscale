export interface UnsupportedPreviewProps {
  readonly renderer?: string;
  readonly message?: string;
}

export function UnsupportedPreview({
  renderer = 'this file type',
  message,
}: UnsupportedPreviewProps) {
  return (
    <div className="artifact-unsupported-preview">
      <strong>Preview unavailable</strong>
      <p>{message ?? `${renderer} previews are not available in this reader.`}</p>
    </div>
  );
}
