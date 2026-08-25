<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RADIO GROUP ITEM
  // ───────────────────────────────────────────────────────────────────
  // This primitive: RadioGroupItem — Preserve Bits UI's group semantics while consumers own the option presentation.
  import { RadioGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<RadioGroup.ItemProps, 'child' | 'children'> {
    children: Snippet;
  }

  let { children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<RadioGroup.Item {...rest}>{@render children()}</RadioGroup.Item>
