<script lang="ts">
  // Renders the provider around a viewer-interaction trigger child (composer
  // textarea + open-diff button). Mirrors the React viewer-interaction Harness
  // + <ArtifactViewerProvider> wrapper. The bare prop passes through to the
  // child to control whether the transcript-scroll/section wrapper renders.
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import ArtifactViewerProvider from '../../src/pages/chat/artifacts/ArtifactViewerProvider.svelte';
  import ViewerInteractionTriggerChild from './ViewerInteractionTriggerChild.svelte';

  let { block, bare = false }: { block: FileDiffBlock; bare?: boolean } = $props();
</script>

<ArtifactViewerProvider>
  <ViewerInteractionTriggerChild {block} {bare} />
</ArtifactViewerProvider>
