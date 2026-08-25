<script lang="ts">
	// ───────────────────────────────────────────────────────────────────
	// MODULE: COLLAPSIBLE PRIMITIVE
	// ───────────────────────────────────────────────────────────────────
	// This primitive: Collapsible — Keep disclosure state bindable while Bits UI owns keyboard and visibility behavior.
	import { Collapsible } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props extends Omit<Collapsible.RootProps, 'open' | 'child' | 'children'> {
		open?: boolean;
		trigger: Snippet;
		children: Snippet;
	}

	let { open = $bindable(false), trigger, children, ...rest }: Props = $props();
</script>

<!-- Component content -->
<Collapsible.Root bind:open {...rest}>
	<h3>
		<Collapsible.Trigger>{@render trigger()}</Collapsible.Trigger>
	</h3>
	<Collapsible.Content>{@render children()}</Collapsible.Content>
</Collapsible.Root>
