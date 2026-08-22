<script lang="ts">
  // @ds primitive: MenuContent — Bits UI DropdownMenu.Content portal that hides outside content, traps Tab, and renders a children snippet.
  import { DropdownMenu } from 'bits-ui';
  import { getContext } from 'svelte';
  import { hideOutside } from './ariaHideOutside.svelte.js';
  import { MENU_DISMISS_KEY } from './Menu.svelte';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ContentProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
  let contentEl = $state<HTMLElement | null>(null);
  const dismiss = getContext<(() => void) | undefined>(MENU_DISMISS_KEY);

  $effect(() => {
    if (contentEl === null) return;
    return hideOutside([contentEl]);
  });

  $effect(() => {
    if (contentEl === null) return;
    const onKeydownCapture = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      if (contentEl === null) return;
      const target = event.target as Node | null;
      if (target !== null && contentEl.contains(target)) {
        // Keep keyboard focus inside the open menu while preserving arrow navigation.
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onKeydownCapture, { capture: true });
    return () => document.removeEventListener('keydown', onKeydownCapture, { capture: true });
  });
</script>

<DropdownMenu.Portal>
  <DropdownMenu.Content {...rest} bind:ref={contentEl}>
    <button type="button" class="sr-only" tabindex="-1" aria-label="Dismiss" onclick={() => dismiss?.()}></button>
    {@render children()}
    <button type="button" class="sr-only" tabindex="-1" aria-label="Dismiss" onclick={() => dismiss?.()}></button>
  </DropdownMenu.Content>
</DropdownMenu.Portal>
