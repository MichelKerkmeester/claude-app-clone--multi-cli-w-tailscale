<script lang="ts">
  import { DropdownMenu } from 'bits-ui';
  import { hideOutside } from './ariaHideOutside.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ContentProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
  let contentEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (contentEl === null) return;
    return hideOutside([contentEl]);
  });
</script>

<DropdownMenu.Portal>
  <DropdownMenu.Content {...rest} bind:ref={contentEl}>{@render children()}</DropdownMenu.Content>
</DropdownMenu.Portal>
