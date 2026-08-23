<script lang="ts">
  // @ds primitive: Sheet — Bits UI Dialog.Root wrapper that publishes sheet-open context and renders a children snippet.
  import { Dialog } from 'bits-ui';
  import { setSheetContext } from '../a11y/aria-hide-outside.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.RootProps, 'open' | 'child' | 'children'> {
    open?: boolean;
    children: Snippet;
  }

  let { open = $bindable(false), children, ...rest }: Props = $props();

  setSheetContext(() => open);
</script>

<Dialog.Root bind:open {...rest}>{@render children()}</Dialog.Root>
