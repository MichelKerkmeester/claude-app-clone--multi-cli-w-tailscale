<script module lang="ts">
  import type { FileDiffBlock, FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

  export interface FilePreviewCardProps {
    readonly block: FilePreviewBlock;
    readonly sessionId: string;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { getOptionalArtifactViewer } from '../artifacts/ArtifactViewerProvider.svelte';
  import { filePreviewAvailability } from '$shared/data/state.js';
  import { formatArtifactSize } from '$shared/data/format.js';
  import Button from '$shared/primitives/Button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { block, sessionId }: FilePreviewCardProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: file-preview-card — read-only preview card; states read from
  //   data-preview-state (ready · withheld · missing · denied · unsupported).
  // @ds guardrail: react-aria Button press, aria-label, and viewer open (onPress) — not designer-editable.
  let buttonEl = $state<HTMLButtonElement | null>(null);
  const viewer = getOptionalArtifactViewer();

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const availability = $derived(filePreviewAvailability(block));
  const stateLabel = $derived({
    ready: 'Ready',
    withheld: 'Withheld',
    missing: 'Missing',
    denied: 'Denied',
    unsupported: 'Unsupported',
  }[availability]);
  const metadata = $derived([
    `${stateLabel} preview`,
    `${block.renderer} · ${block.mimeType}`,
    `Revision ${block.revision}`,
    block.byteLength === null ? 'Size unavailable' : `${formatArtifactSize(block.byteLength)}`,
    block.redaction === 'withheld' ? 'Relay withheld content' : 'Relay metadata only',
  ].join('\n'));
</script>

<div class="file-preview-card" data-preview-state={availability}>
  <Button
    class="artifact-card"
    aria-label={`Open file preview: ${block.displayName}`}
    data-artifact-session-id={sessionId}
    onclick={() => viewer?.openDiff(block as unknown as FileDiffBlock, buttonEl)}
    {@attach (node) => {
      buttonEl = node as HTMLButtonElement;
      return () => {
        if (buttonEl === node) buttonEl = null;
      };
    }}
  >
    <span class="artifact-card-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 7h14M5 12h14M5 17h8" />
        <path d="M16 15v6M13 18h6" />
      </svg>
    </span>
    <span class="artifact-card-body">
      <span class="artifact-card-meta">
        <span>File preview</span>
        <span>{stateLabel}</span>
      </span>
      <span class="artifact-card-summary">{block.displayName}</span>
      <span class="artifact-card-peek" aria-label="Preview metadata">
        {metadata}
      </span>
    </span>
    <span class="artifact-card-open" aria-hidden="true">
      Open
    </span>
  </Button>
</div>
