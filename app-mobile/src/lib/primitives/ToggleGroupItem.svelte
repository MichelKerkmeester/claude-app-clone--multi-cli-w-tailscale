<script lang="ts">
  import { ToggleGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<ToggleGroup.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<ToggleGroup.Item {...rest}>{@render children()}</ToggleGroup.Item>
