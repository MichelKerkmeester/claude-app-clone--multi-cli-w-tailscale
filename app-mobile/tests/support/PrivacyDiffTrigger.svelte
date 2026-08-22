<script lang="ts">
  // Child of PrivacyDiffHarness: rendered inside ArtifactViewerProvider so
  // getArtifactViewer() resolves. Mirrors the React OpenDiff helper.
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import { getArtifactViewer } from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';

  const DIFF: FileDiffBlock = {
    id: 'block_phase_privacy_lifecycle',
    revision: 1,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'file_diff',
    summary: 'Privacy diff',
    patch: '@@ privacy\n-safe',
  };

  const viewer = getArtifactViewer();
</script>

<button type="button" onclick={(event) => viewer.openDiff(DIFF, event.currentTarget)}>
  Open privacy diff
</button>
