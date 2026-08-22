<script lang="ts">
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';

  // Consumes the viewer context from inside the provider, mirroring the React
  // useArtifactViewer() harness so the a11y suite drives the real open path.
  const viewer = getArtifactViewer();

  const DIFF: FileDiffBlock = {
    id: 'block_viewer_a11y',
    revision: 3,
    seq: 4,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'file_diff',
    summary: 'A11y diff',
    patch: '@@ a11y\n-old\n+new',
  };
</script>

<textarea class="composer-input" aria-label="Message Pi"></textarea>
<button type="button" onclick={(event) => viewer.openDiff(DIFF, event.currentTarget)}>Open a11y diff</button>
