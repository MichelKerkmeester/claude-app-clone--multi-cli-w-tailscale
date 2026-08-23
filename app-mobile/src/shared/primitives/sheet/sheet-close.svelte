<script lang="ts">
  // @ds primitive: SheetClose — Bits UI Dialog.Close re-export that renders a children snippet.
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.CloseProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<Dialog.Close {...rest}>{@render children()}</Dialog.Close>
