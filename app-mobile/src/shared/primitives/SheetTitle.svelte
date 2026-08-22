<script lang="ts">
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.TitleProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<Dialog.Title {...rest}>{@render children()}</Dialog.Title>
