<script module lang="ts">
  // This module holds the shared Artifact Details types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ARTIFACT DETAILS
  // ───────────────────────────────────────────────────────────────────

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
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  // This surface: ArtifactDetails — openable definition list of image-artifact metadata.
  interface Props {
    model: ArtifactDetailsModel;
    open: boolean;
    id?: string;
  }

  let { model, open, id = 'artifact-details' }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep format bytes focused on its single responsibility.
  function formatBytes(value: number): string {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<!-- Component content -->
{#if open}
  <section {id} class="artifact-details" aria-label="Image details">
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
        <dd dir="ltr">{model.width} × {model.height}</dd>
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
{/if}

<!-- Artifact details -->
<!-- This surface: artifact-details — labelled metadata rows for an open image artifact.
     Single-component; the definition list is this file's own markup. -->
<style>
  /* This slot: details — the openable image-metadata panel under the viewer preview. */
  .artifact-details {
    min-inline-size: 0;
    margin-block-start: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
  }

  /* This slot: facts — stacks each image field as its own row. */
  .artifact-details dl {
    display: grid;
    gap: 0;
    margin: 0;
  }

  /* This slot: fact-row — label column + wrapping value, not a run-on list. */
  .artifact-details dl > div {
    display: grid;
    grid-template-columns: minmax(7rem, 11rem) minmax(0, 1fr);
    gap: var(--space-3);
    align-items: baseline;
    padding-block: var(--space-2);
    border-block-start: 1px solid var(--line);
  }

  /* Keep the first row flush with the panel; later rows keep the divider. */
  .artifact-details dl > div:first-child {
    padding-block-start: 0;
    border-block-start: none;
  }

  /* This slot: fact-label — quiet uppercase metadata name. */
  .artifact-details dt {
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* This slot: fact-value — the field read-out; dd default indent would offset the column. */
  .artifact-details dd {
    margin: 0;
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
</style>
