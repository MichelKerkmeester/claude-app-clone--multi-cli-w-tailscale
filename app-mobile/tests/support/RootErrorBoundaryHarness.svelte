<script lang="ts">
  import RootErrorBoundary from '../../src/lib/RootErrorBoundary.svelte';
  import ThrowingChild from './ThrowingChild.svelte';

  let { throwError = false }: { throwError?: boolean } = $props();
</script>

<RootErrorBoundary>
  {#if throwError}
    <ThrowingChild />
  {:else}
    <p>All good</p>
  {/if}
</RootErrorBoundary>