<script lang="ts">
	import { Collapsible } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props extends Omit<Collapsible.RootProps, 'open' | 'child' | 'children'> {
		open?: boolean;
		trigger: Snippet;
		children: Snippet;
	}

	let { open = $bindable(false), trigger, children, ...rest }: Props = $props();
</script>

<Collapsible.Root bind:open {...rest}>
	<Collapsible.Trigger>{@render trigger()}</Collapsible.Trigger>
	<Collapsible.Content>{@render children()}</Collapsible.Content>
</Collapsible.Root>
