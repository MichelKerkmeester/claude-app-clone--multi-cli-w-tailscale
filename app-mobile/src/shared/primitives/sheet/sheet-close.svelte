<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET CLOSE
  // ───────────────────────────────────────────────────────────────────
  // @ds primitive: SheetClose — Preserve Bits UI's dialog-close semantics while consumers own the control markup.
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.CloseProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<Dialog.Close {...rest}>{@render children()}</Dialog.Close>
