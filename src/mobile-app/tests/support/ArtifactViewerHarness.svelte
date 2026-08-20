<script lang="ts">
  import ArtifactViewerProvider from '../../src/lib/artifacts/ArtifactViewerProvider.svelte';
  import ArtifactViewerTrigger from './ArtifactViewerTrigger.svelte';
</script>

<ArtifactViewerProvider>
  <section aria-label="Typed transcript" tabindex="-1">
    <div class="transcript-scroll">
      <ArtifactViewerTrigger />
    </div>
  </section>
</ArtifactViewerProvider>
