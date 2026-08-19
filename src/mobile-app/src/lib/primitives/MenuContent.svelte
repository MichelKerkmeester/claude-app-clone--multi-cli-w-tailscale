<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ContentProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Portal>
  <DropdownMenu.Content {...rest}>{@render children()}</DropdownMenu.Content>
</DropdownMenu.Portal>
