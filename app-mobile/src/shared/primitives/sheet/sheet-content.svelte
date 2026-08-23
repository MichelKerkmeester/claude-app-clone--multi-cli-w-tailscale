<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET CONTENT
  // ───────────────────────────────────────────────────────────────────
  // @ds primitive: SheetContent — Keep assistive technology within the open sheet by hiding unrelated outside content.
  import { Dialog } from 'bits-ui';
  import { getSheetContext, hideOutside } from '../a11y/aria-hide-outside.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.ContentProps, 'child' | 'children'> {
    overlayClass?: string;
    children: Snippet;
  }

  let { overlayClass, children, ...rest }: Props = $props();
  let contentEl = $state<HTMLElement | null>(null);
  let overlayEl = $state<HTMLElement | null>(null);
  const sheetContext = getSheetContext();

  $effect(() => {
    if (sheetContext?.isOpen() !== true || contentEl === null || overlayEl === null) return;
    return hideOutside([contentEl, overlayEl]);
  });
</script>

<Dialog.Portal>
  <Dialog.Overlay bind:ref={overlayEl} class={overlayClass} />
  <Dialog.Content bind:ref={contentEl} {...rest}>{@render children()}</Dialog.Content>
</Dialog.Portal>
