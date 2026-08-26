<script module lang="ts">
  // This module holds the shared Transcript Action Menu types.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TRANSCRIPT ACTION MENU
  // ───────────────────────────────────────────────────────────────────

  export interface TranscriptActionRow {
    readonly id: string;
    readonly label: string;
    readonly disabled: boolean;
    readonly hint: string | null;
  }

  export interface TranscriptActionMenuProps {
    readonly open: boolean;
    readonly x: number;
    readonly y: number;
    readonly rows: readonly TranscriptActionRow[];
    readonly onSelect: (id: string) => void;
    readonly onClose: () => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { open, x, y, rows, onSelect, onClose }: TranscriptActionMenuProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let menuEl = $state<HTMLDivElement | null>(null);
  let portalEl = $state<HTMLDivElement | null>(null);
  let flipped = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Portal out of the overflow-clipped transcript so the menu is not cut off.
  $effect(() => {
    if (!open) return;
    const host = document.createElement('div');
    host.className = 'transcript-action--portal';
    document.body.append(host);
    portalEl = host;
    return () => {
      host.remove();
      portalEl = null;
    };
  });

  $effect(() => {
    const menu = menuEl;
    if (!open || menu === null) return;
    return hideOutside([menu]);
  });

  $effect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        untrack(() => onClose());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  $effect(() => {
    const menu = menuEl;
    if (!open || menu === null) return;
    const rect = menu.getBoundingClientRect();
    const overflow = y + rect.height > window.innerHeight - 8;
    flipped = overflow;
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function attachMenu(node: HTMLDivElement): () => void {
    menuEl = node;
    return () => {
      if (menuEl === node) menuEl = null;
    };
  }
</script>

{#if open && portalEl !== null}
  {@render menuPortal()}
{/if}

{#snippet menuPortal()}
  {@const top = flipped ? undefined : y}
  {@const bottom = flipped ? Math.max(8, window.innerHeight - y) : undefined}
  <button
    type="button"
    class="transcript-action--backdrop"
    aria-label="Dismiss"
    {@attach (node) => {
      portalEl?.append(node);
      return () => node.remove();
    }}
    onclick={onClose}
  ></button>
  <div
    class="transcript-action--menu"
    role="menu"
    aria-label="Transcript actions"
    tabindex="-1"
    style:top={top === undefined ? undefined : `${top}px`}
    style:bottom={bottom === undefined ? undefined : `${bottom}px`}
    style:left={`${Math.max(8, Math.min(x, window.innerWidth - 220))}px`}
    {@attach (node) => {
      portalEl?.append(node);
      return attachMenu(node);
    }}
  >
    {#each rows as row (row.id)}
      <button
        type="button"
        class="transcript-action--row"
        role="menuitem"
        use:hover
        use:press
        use:focusVisible
        disabled={row.disabled}
        aria-disabled={row.disabled}
        onclick={() => {
          if (row.disabled) return;
          onSelect(row.id);
        }}
      >
        <span>{row.label}</span>
        {#if row.disabled && row.hint !== null}
          <span class="transcript-action--hint">{row.hint}</span>
        {/if}
      </button>
    {/each}
  </div>
{/snippet}

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. PORTAL MENU
  ─────────────────────────────────────────────────────────────────── */
  /* Fixed-position body portal so overflow clipping cannot hide the rows. */
  .transcript-action--backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }

  .transcript-action--menu {
    position: fixed;
    z-index: 41;
    display: grid;
    min-inline-size: 12rem;
    max-inline-size: min(20rem, calc(100vw - 16px));
    padding: var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  .transcript-action--row {
    display: grid;
    justify-items: start;
    min-block-size: 44px;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font-size: 0.9rem;
    text-align: start;
    cursor: pointer;
  }

  .transcript-action--row:global([data-hovered]) {
    background: var(--surface-muted);
  }

  .transcript-action--row:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .transcript-action--row:disabled {
    color: var(--ink-muted);
    cursor: default;
  }

  .transcript-action--hint {
    color: var(--ink-muted);
    font-size: 0.75rem;
  }
</style>
