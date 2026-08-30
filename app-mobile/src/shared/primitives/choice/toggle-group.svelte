<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TOGGLE GROUP
  // ───────────────────────────────────────────────────────────────────
  // This primitive: ToggleGroup — Expose a bindable single-select group without duplicating Bits UI state handling.
  import { ToggleGroup } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props extends Omit<Extract<ToggleGroup.RootProps, { type: 'single' }>, 'type' | 'value' | 'child' | 'children'> {
    value?: string;
    children: Snippet;
  }

  let {
    value = $bindable(''),
    orientation = 'horizontal',
    children,
    onValueChange: onRootValueChange,
    ...rest
  }: Props = $props();
  let lastNonEmptyValue = $state(value);

  $effect(() => {
    if (value !== '') lastNonEmptyValue = value;
  });

  function handleValueChange(next: string): void {
    if (next === '') {
      value = lastNonEmptyValue;
      return;
    }

    lastNonEmptyValue = next;
    onRootValueChange?.(next);
  }
</script>

<!-- Component content -->
{#snippet root({ props }: { props: Record<string, unknown> })}
  <div {...props} role="radiogroup">
    {@render children()}
  </div>
{/snippet}

<ToggleGroup.Root
	type="single"
	bind:value
	orientation={orientation}
	{...rest}
	aria-orientation={orientation}
	onValueChange={handleValueChange}
	child={root}
/>
