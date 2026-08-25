<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: IMAGE PLACEHOLDER
  // ───────────────────────────────────────────────────────────────────

  // This surface: ImagePlaceholder — empty inbound-image well shown while pixels are unavailable.
  interface Props {
    aspectRatio?: number | null;
    state: string;
    noAspect?: boolean;
  }

  let { aspectRatio, state, noAspect = false }: Props = $props();
</script>

<!-- Component content -->
<div
  class="inbound-image--well inbound-image-well-placeholder"
  data-image-well="placeholder"
  data-image-state={state}
  data-no-pixels="true"
  style:aspect-ratio={!noAspect && aspectRatio !== null && aspectRatio !== undefined
    ? String(aspectRatio)
    : undefined}
  aria-hidden="true"
>
  <span class="inbound-image--placeholder-pattern"></span>
</div>
