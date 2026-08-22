<script lang="ts">
  // Renders the provider around a single 'Open privacy diff' trigger child,
  // mirroring the React privacy-lifecycle oracle's <ArtifactViewerProvider><OpenDiff/>
  // wrapper so the ported test can drive the privacy-curtain lifecycle.
  import ArtifactViewerProvider from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';
  import PrivacyDiffTrigger from './PrivacyDiffTrigger.svelte';
</script>

<ArtifactViewerProvider>
  <PrivacyDiffTrigger />
</ArtifactViewerProvider>
