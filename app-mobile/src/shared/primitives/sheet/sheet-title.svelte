<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET TITLE
  // ───────────────────────────────────────────────────────────────────
  // This primitive: SheetTitle — Preserve Bits UI's accessible dialog-title semantics while consumers own the markup.
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Dialog.TitleProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<Dialog.Title {...rest}>{@render children()}</Dialog.Title>
