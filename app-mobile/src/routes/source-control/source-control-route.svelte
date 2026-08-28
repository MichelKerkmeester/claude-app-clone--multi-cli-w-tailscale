<script lang="ts">
  // This module holds the host-gated source-control route contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SOURCE CONTROL ROUTE
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { SourceControlRouteProps } from './segment.js';
  import SourceControlHub from '../../pages/chat/source-control/source-control-hub.svelte';
  import { resolveSourceControlSegment } from './segment.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { data = null }: SourceControlRouteProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const sourceControl = $derived(data?.sourceControl ?? null);
  const capability = $derived(data?.sourceControlCapability === true);
  const requestedSegment = $derived(resolveSourceControlSegment(data?.requestedSegment));
</script>

<!-- Component content -->
<SourceControlHub
  data={sourceControl}
  requestedSegment={requestedSegment}
  capability={capability}
/>
