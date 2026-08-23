<script module lang="ts">
  export const MENU_DISMISS_KEY = Symbol('pi-menu-dismiss');
</script>

<script lang="ts">
  // @ds primitive: Menu — Bits UI DropdownMenu.Root wrapper that provides a dismiss context and renders a children snippet.
  import { DropdownMenu } from 'bits-ui';
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.RootProps, 'open' | 'child' | 'children'> {
    open?: boolean;
    children: Snippet;
  }

  let { open = $bindable(false), children, ...rest }: Props = $props();
  setContext(MENU_DISMISS_KEY, () => {
    open = false;
  });
</script>

<DropdownMenu.Root bind:open {...rest}>{@render children()}</DropdownMenu.Root>
