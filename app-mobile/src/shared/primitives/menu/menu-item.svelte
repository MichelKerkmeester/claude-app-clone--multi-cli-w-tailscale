<script lang="ts">
  // @ds primitive: MenuItem — Bits UI DropdownMenu.Item re-export that renders a children snippet.
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Item {...rest}>{@render children()}</DropdownMenu.Item>
