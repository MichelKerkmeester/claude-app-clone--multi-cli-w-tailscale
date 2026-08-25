<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET ROOT
  // ───────────────────────────────────────────────────────────────────
  // This primitive: Sheet — Keep dialog state bindable so consumers can control the overlay without duplicating Bits UI behavior.
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

<!-- Component content -->
<Dialog.Root bind:open {...rest}>{@render children()}</Dialog.Root>
