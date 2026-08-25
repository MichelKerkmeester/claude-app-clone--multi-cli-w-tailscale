<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RADIO GROUP
  // ───────────────────────────────────────────────────────────────────
  // This primitive: RadioGroup — Expose a bindable selection while leaving group behavior to Bits UI.
  import { RadioGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<RadioGroup.RootProps, 'value' | 'child' | 'children'> {
    value?: string;
    children: Snippet;
  }

  let { value = $bindable(''), children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<RadioGroup.Root bind:value {...rest}>{@render children()}</RadioGroup.Root>
