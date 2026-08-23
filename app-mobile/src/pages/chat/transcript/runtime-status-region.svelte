<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RUNTIME STATUS REGION
  // ───────────────────────────────────────────────────────────────────

  import { runtimeAnnouncement, type RuntimeUiState } from '$shared/state/runtime.js';

  /**
   * This is the one document-level polite atomic runtime status region.
   * Confirmations and failures use it so announcements survive sheet dismissal
   * Without competing live regions, copy remains bounded local text.
   */
  export interface RuntimeStatusRegionProps {
    readonly runtime: RuntimeUiState;
  }
</script>

<script lang="ts">
  let { runtime }: RuntimeStatusRegionProps = $props();

  // @ds surface: runtime-status-region — sr-only live status region.
  // @ds guardrail: role="status" + aria-live polite + aria-atomic + the runtime announcement string are a11y wiring, not designer-editable.
</script>

<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-runtime-announcer="true">{runtimeAnnouncement(runtime)}</div>
