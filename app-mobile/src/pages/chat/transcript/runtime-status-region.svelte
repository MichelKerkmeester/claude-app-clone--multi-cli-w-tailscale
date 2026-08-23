<script module lang="ts">
  import { runtimeAnnouncement, type RuntimeUiState } from '$shared/state/runtime.js';

  /**
   * The one document-level polite atomic runtime status region. Confirmations
   * and failures announce through this single region so announcements survive
   * sheet dismissal without competing live regions; copy is bounded local text.
   */
  export interface RuntimeStatusRegionProps {
    readonly runtime: RuntimeUiState;
  }
</script>

<script lang="ts">
  let { runtime }: RuntimeStatusRegionProps = $props();

  // @ds surface: runtime-status-region — sr-only live status region.
  // @ds guardrail: role="status" + aria-live polite + aria-atomic + the runtime announcement
  //   string are a11y wiring, not designer-editable.
</script>

<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-runtime-announcer="true">{runtimeAnnouncement(runtime)}</div>
