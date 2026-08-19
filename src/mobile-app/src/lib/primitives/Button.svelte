<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLButtonAttributes, 'class' | 'type' | 'disabled' | 'onclick'> {
		class?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let {
		class: className,
		type = 'button',
		disabled,
		onclick,
		children,
		...rest
	}: Props = $props();
</script>

<button {...rest} class={className} type={type} disabled={disabled} onclick={onclick}>
	{@render children()}
</button>
