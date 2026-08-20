<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.TriggerProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Trigger {...rest}>{@render children()}</DropdownMenu.Trigger>
