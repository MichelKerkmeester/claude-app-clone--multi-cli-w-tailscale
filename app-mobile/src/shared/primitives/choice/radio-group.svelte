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

  let { value = $bindable(''), orientation = 'vertical', children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<RadioGroup.Root bind:value orientation={orientation} {...rest} aria-orientation={orientation}>
  {@render children()}
</RadioGroup.Root>
