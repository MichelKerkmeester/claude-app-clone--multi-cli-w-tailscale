export interface ArtifactDetailsModel {
  readonly displayName: string;
  readonly mediaType: string;
  readonly width: number;
  readonly height: number;
  readonly thumbnailBytes: number;
  readonly fullBytes: number;
  readonly revision: string;
  readonly processing: 'complete' | 'redacted';
  readonly redaction: 'not-needed' | 'applied';
}

export interface ArtifactDetailsProps {
  readonly model: ArtifactDetailsModel;
  readonly open: boolean;
  readonly id?: string;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArtifactDetails({ model, open, id = 'artifact-details' }: ArtifactDetailsProps) {
  if (!open) return null;
  return (
    <section id={id} className="artifact-details" aria-label="Image details">
      <dl>
        <div>
          <dt>Display name</dt>
          <dd dir="auto">{model.displayName}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd dir="ltr">{model.mediaType}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd dir="ltr">
            {model.width} × {model.height}
          </dd>
        </div>
        <div>
          <dt>Preview size</dt>
          <dd dir="ltr">{formatBytes(model.thumbnailBytes)}</dd>
        </div>
        <div>
          <dt>Full size</dt>
          <dd dir="ltr">{formatBytes(model.fullBytes)}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd dir="ltr">{model.revision}</dd>
        </div>
        <div>
          <dt>Processing</dt>
          <dd>{model.processing === 'complete' ? 'Complete' : 'Redacted'}</dd>
        </div>
        <div>
          <dt>Redaction</dt>
          <dd>{model.redaction === 'applied' ? 'Applied' : 'Not needed'}</dd>
        </div>
      </dl>
    </section>
  );
}
