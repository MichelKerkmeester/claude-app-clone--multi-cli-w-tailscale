<script module lang="ts">
  // This module holds the shared Session State Icon Story Host types and helpers.
  import type { Snippet } from 'svelte';
  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

  export interface SessionStateIconStoryHostProps {
    readonly status: SessionCardDto['status'];
    readonly children: Snippet;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION STATE ICON STORY HOST
  // ───────────────────────────────────────────────────────────────────
  // The icon paints with currentColor. Live roster and agent-row surfaces wrap
  // it in `.state--idle` / `.state--running` / `.state--interrupted` so the disc
  // inherits the status colour. Isolated stories have no such parent, so this
  // host supplies the same wrapper. Unknown has no global colour rule; the
  // roster's `.session--state` fallback is ink-muted.

  let { status, children }: SessionStateIconStoryHostProps = $props();

  const stateClass = $derived(
    status === 'idle' || status === 'running' || status === 'interrupted' ? status : 'unknown',
  );
</script>

<!-- Component content -->
<span class={`state--${stateClass}`}>
  {@render children()}
</span>

<style>
  /* Unknown has no global status colour; match the roster label's fallback ink. */
  .state--unknown {
    color: var(--ink-muted);
  }
</style>
