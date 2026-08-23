<script lang="ts">
  // @ds primitive: MenuTrigger — Bits UI DropdownMenu.Trigger re-export that renders a children snippet.
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.TriggerProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Trigger {...rest}>{@render children()}</DropdownMenu.Trigger>
