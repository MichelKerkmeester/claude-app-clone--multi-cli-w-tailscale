<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: COMPOSER TOOLS STORY HOST
  // ───────────────────────────────────────────────────────────────────
  // Isolated stories cannot seed the popover through production props. This
  // host mounts ComposerTools and clicks the real + trigger after mount so the
  // catalog photographs the open path a person uses.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount, tick } from 'svelte';
  import ComposerTools, { type ComposerToolsProps } from './composer-tools.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { ...props }: ComposerToolsProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let root = $state<HTMLElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  onMount(() => {
    void tick().then(() => {
      root?.querySelector<HTMLButtonElement>('.composer--plus')?.click();
    });
  });
</script>

<!-- Component content -->
<div bind:this={root}>
  <ComposerTools {...props} />
</div>
