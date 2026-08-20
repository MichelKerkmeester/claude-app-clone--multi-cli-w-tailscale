<script lang="ts">
  import { RadioGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<RadioGroup.RootProps, 'value' | 'child' | 'children'> {
    value?: string;
    children: Snippet;
  }

  let { value = $bindable(''), children, ...rest }: Props = $props();
</script>

<RadioGroup.Root bind:value {...rest}>{@render children()}</RadioGroup.Root>
