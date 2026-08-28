<script lang="ts">
  // This route: /source-control/<segment> — deep-linkable source-control segment.
  import SourceControlRoute from '../source-control-route.svelte';
  import type { SourceControlRouteData } from '../segment.js';

  let { data = null }: { data?: SourceControlRouteData | null } = $props();
</script>

<!-- Component content -->
<SourceControlRoute {data} />
