<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: MENU CONTENT
  // ───────────────────────────────────────────────────────────────────
  // @ds primitive: MenuContent — Keep keyboard and assistive-technology focus within the open menu.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { DropdownMenu } from 'bits-ui';
  import { getContext } from 'svelte';
  import { hideOutside } from '../a11y/aria-hide-outside.svelte.js';
  import { MENU_DISMISS_KEY } from './menu.svelte';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.ContentProps, 'child' | 'children'> {
    children: Snippet;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { children, ...rest }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let contentEl = $state<HTMLElement | null>(null);
  const dismiss = getContext<(() => void) | undefined>(MENU_DISMISS_KEY);

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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
