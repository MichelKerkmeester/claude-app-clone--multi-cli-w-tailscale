<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: FRESHNESS
  // ───────────────────────────────────────────────────────────────────

  export interface FreshnessProps {
    readonly stale: boolean;
    readonly at: string | null;
  }
</script>

<script lang="ts">
  import { relativeTime } from '$shared/format/view-helpers.js';

  import './freshness.css';

  let { stale, at }: FreshnessProps = $props();
</script>

<!-- @ds surface: freshness — sync staleness readout. -->
<div class={`freshness ${stale ? 'is-stale' : ''}`}>
  <span>{stale ? 'Stale, input disabled' : 'Live, steering enabled'}</span>
  <time datetime={at ?? undefined}>{at === null ? 'Not synced' : relativeTime(at)}</time>
</div>

<!-- @ds surface: freshness — sync staleness readout. Decomposed into this co-located CSS file; freshness,
     freshness time and freshness.is-stale are owned solely by this component so they move with it.
     The @media (max-width: 39rem) .section-heading .freshness variant has an external ancestor
     (.section-heading, rendered by section headings, not this component), so the ancestor is
     :global(...) while the .freshness descendant stays scoped — matching the original selector
     structure byte-for-byte. Values unchanged. -->
