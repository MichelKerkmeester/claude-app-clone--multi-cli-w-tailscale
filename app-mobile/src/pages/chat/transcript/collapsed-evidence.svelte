<script module lang="ts">
  // This module holds the shared Collapsed Evidence types and helpers.
  import type { Snippet } from 'svelte';

  export interface CollapsedEvidenceProps {
    readonly blockId?: string;
    readonly summary: string;
    readonly inFlight?: boolean;
    readonly children: Snippet;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import ToolFold from './tool-fold.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { blockId, summary, inFlight = false, children }: CollapsedEvidenceProps = $props();
</script>

<!-- Evidence disclosure -->
<!-- Native one-line fold; a missing result is named in-flight rather than blank. -->
<ToolFold
  summary={summary}
  inFlight={inFlight}
  {...(blockId === undefined ? {} : { blockId })}
>{@render children()}</ToolFold>
