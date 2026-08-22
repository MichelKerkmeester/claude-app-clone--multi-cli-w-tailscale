<script lang="ts">
  // @ds primitive: RadioGroupItem — Bits UI RadioGroup.Item re-export that renders a children snippet.
  import { RadioGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<RadioGroup.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<RadioGroup.Item {...rest}>{@render children()}</RadioGroup.Item>
