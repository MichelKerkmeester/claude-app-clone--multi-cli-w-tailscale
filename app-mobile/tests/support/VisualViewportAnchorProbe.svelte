<script module lang="ts">
  // Probe for the useVisualViewportAnchor describe block in
  // ComposerCommandAutocomplete.svelte.test.ts. The Svelte hook is a runes
  // module (.svelte.ts) whose $effect only runs inside a component lifecycle,
  // so the React oracle's <Probe/> is ported as this Svelte component. It
  // exposes viewportHeightPx via a data-testid (the resize-tracking test) and
  // the hook's $effect mirrors --visual-viewport-height onto
  // document.documentElement (the fallback-innerHeight test).
  export interface VisualViewportAnchorProbeProps {
    readonly getAnchor?: () => Element | null;
  }
</script>

<script lang="ts">
  import { useVisualViewportAnchor } from '../../src/shared/data/useVisualViewportAnchor.svelte.js';

  let { getAnchor = () => null }: VisualViewportAnchorProbeProps = $props();

  const anchor = useVisualViewportAnchor(getAnchor);
  const viewportHeightPx = $derived(anchor.viewportHeightPx);
</script>

<div data-testid="probe">{viewportHeightPx ?? 'none'}</div>
