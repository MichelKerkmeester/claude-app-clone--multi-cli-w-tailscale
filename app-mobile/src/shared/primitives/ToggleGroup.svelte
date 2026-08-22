<script lang="ts">
  import { ToggleGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Extract<ToggleGroup.RootProps, { type: 'single' }>, 'type' | 'value' | 'child' | 'children'> {
    value?: string;
    children: Snippet;
  }

  let { value = $bindable(''), children, ...rest }: Props = $props();
</script>

{#snippet root({ props }: { props: Record<string, unknown> })}
  <div {...props} role="radiogroup">
    {@render children()}
  </div>
{/snippet}

<ToggleGroup.Root type="single" bind:value {...rest} child={root} />
