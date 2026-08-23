<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: MENU ITEM
  // ───────────────────────────────────────────────────────────────────
  // @ds primitive: MenuItem — Preserve Bits UI's menu-item semantics while consumers own the item presentation.
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Item {...rest}>{@render children()}</DropdownMenu.Item>
