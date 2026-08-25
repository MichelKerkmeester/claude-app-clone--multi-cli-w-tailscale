<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TOGGLE GROUP ITEM
  // ───────────────────────────────────────────────────────────────────
  // This primitive: ToggleGroupItem — Preserve Bits UI's toggle semantics while consumers own the option presentation.
  import { ToggleGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<ToggleGroup.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<ToggleGroup.Item {...rest}>{@render children()}</ToggleGroup.Item>
