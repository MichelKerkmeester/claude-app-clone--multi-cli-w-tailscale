<script module lang="ts">
  export interface FreshnessProps {
    readonly stale: boolean;
    readonly at: string | null;
  }
</script>

<script lang="ts">
  import { relativeTime } from '../../shared/data/view-helpers.js';

  let { stale, at }: FreshnessProps = $props();
</script>

<!-- @ds surface: freshness — sync staleness readout. -->
<div class={`freshness ${stale ? 'is-stale' : ''}`}>
  <span>{stale ? 'Stale, input disabled' : 'Live, steering enabled'}</span>
  <time datetime={at ?? undefined}>{at === null ? 'Not synced' : relativeTime(at)}</time>
</div>

<!-- @ds surface: freshness — sync staleness readout. Decomposed into this scoped block; freshness,
     freshness time and freshness.is-stale are owned solely by this component so they move with it.
     The @media (max-width: 39rem) .section-heading .freshness variant has an external ancestor
     (.section-heading, rendered by section headings, not this component), so the ancestor is
     :global(...) while the .freshness descendant stays scoped — matching the original selector
     structure byte-for-byte. Values unchanged. -->
<style>
  /* @ds surface: freshness — sync staleness readout. */
  .freshness {
    display: grid;
    justify-items: end;
    gap: 0.2rem;
    color: var(--success);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  /* @ds slot: time — last-sync timestamp. */
  .freshness time {
    color: var(--ink-muted);
    font-weight: 550;
    letter-spacing: 0;
    text-transform: none;
  }

  /* @ds state: stale */
  .freshness.is-stale {
    color: var(--warning);
  }

  @media (max-width: 39rem) {
    :global(.section-heading) .freshness {
      justify-items: start;
    }
  }
  /* @ds end surface: freshness */
</style>
