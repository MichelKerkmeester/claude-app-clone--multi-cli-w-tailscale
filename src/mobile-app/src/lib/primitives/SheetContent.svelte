<script lang="ts">
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.ContentProps, 'child' | 'children'> {
    overlayClass?: string;
    children: Snippet;
  }

  let { overlayClass, children, ...rest }: Props = $props();
</script>

<Dialog.Portal>
  <Dialog.Overlay class={overlayClass} />
  <Dialog.Content {...rest}>{@render children()}</Dialog.Content>
</Dialog.Portal>
