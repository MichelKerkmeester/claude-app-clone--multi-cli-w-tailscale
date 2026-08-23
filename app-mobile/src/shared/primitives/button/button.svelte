<script lang="ts">
	// @ds primitive: Button — Native button element with hover, press, and focus interaction actions that renders a children snippet.
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { hover, press, focusVisible, focused } from '../a11y/interactions.js';

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

<button
	{...rest}
	class={className}
	type={type}
	disabled={disabled}
	onclick={onclick}
	data-disabled={disabled ? 'true' : undefined}
	use:hover
	use:press
	use:focusVisible
	use:focused
>
	{@render children()}
</button>
