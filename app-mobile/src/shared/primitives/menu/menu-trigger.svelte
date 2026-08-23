<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: MENU TRIGGER
  // ───────────────────────────────────────────────────────────────────
  // @ds primitive: MenuTrigger — Preserve Bits UI's menu-trigger semantics while consumers own the trigger presentation.
  import { DropdownMenu } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<DropdownMenu.TriggerProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<DropdownMenu.Trigger {...rest}>{@render children()}</DropdownMenu.Trigger>
