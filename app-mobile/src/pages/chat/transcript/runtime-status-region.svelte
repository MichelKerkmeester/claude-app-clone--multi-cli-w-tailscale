<script module lang="ts">
  // This module holds the shared Runtime Status Region types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RUNTIME STATUS REGION
  // ───────────────────────────────────────────────────────────────────

  import { runtimeAnnouncement, type RuntimeUiState } from '$shared/state/runtime.js';

  /**
   * Document-level polite atomic runtime status — survives sheet dismissal without competing regions.
   */
  export interface RuntimeStatusRegionProps {
    readonly runtime: RuntimeUiState;
  }
</script>

<script lang="ts">
  let { runtime }: RuntimeStatusRegionProps = $props();

  // This surface: runtime-status-region — sr-only live status region.
  // Do not edit — role="status" + aria-live polite + aria-atomic + the runtime announcement string are a11y wiring, not designer-editable.
</script>

<!-- Component content -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-runtime-announcer="true">{runtimeAnnouncement(runtime)}</div>
