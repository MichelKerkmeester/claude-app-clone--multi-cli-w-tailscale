<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TOKEN PLAYGROUND
  // ───────────────────────────────────────────────────────────────────
  // A designer surface for the design system itself. Every token the
  // stylesheets declare on :root is listed, editable, and applied live; the
  // change persists for this browser, so navigating to any other story shows
  // the retune rather than the shipped palette.
  //
  // The token list is read from the CSSOM rather than hand-kept, so it cannot
  // drift from the stylesheet. A token whose light and dark values differ is
  // labelled, because overriding one pins it flat across both themes — the
  // exact shape of defect that made an entire theme render invisible text.
  //
  // This writes no stylesheet. It hands back a block to paste, so the token
  // gate stays the one authority on what a token actually is.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount } from 'svelte';

  import {
    applyOverrides,
    discoverTokens,
    readOverrides,
    themeValues,
    toCssBlock,
    writeOverrides,
    type TokenThemeValues,
  } from './token-overrides.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Ordered so the highest-leverage edits come first: the eight primitives
  // feed most semantic roles, so retuning one moves the whole surface.
  const GROUP_ORDER = [
    'Palette primitives',
    'Surfaces',
    'Ink',
    'Accent',
    'Status',
    'Lines and depth',
    'Diff tints',
    'Session dock',
    'Spacing',
    'Radius',
    'Motion',
    'Other',
  ] as const;

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function groupOf(name: string): string {
    if (name.startsWith('--pi-')) return 'Palette primitives';
    if (name.startsWith('--space-')) return 'Spacing';
    if (name.startsWith('--radius-')) return 'Radius';
    if (name.startsWith('--duration-') || name.startsWith('--ease-')) return 'Motion';
    if (name.startsWith('--dock-')) return 'Session dock';
    if (name.startsWith('--diff-')) return 'Diff tints';
    if (/^--(canvas|surface)/u.test(name)) return 'Surfaces';
    if (/^--(ink|placeholder|on-)/u.test(name)) return 'Ink';
    if (/^--accent/u.test(name)) return 'Accent';
    if (/^--(success|warning|danger)/u.test(name)) return 'Status';
    if (/^--(line|control-border|decoration|focus|scrim|shadow)/u.test(name)) return 'Lines and depth';
    return 'Other';
  }

  // Painting the value and reading the pixel back delegates parsing to the
  // engine, so oklch() and color-mix() resolve exactly as they render — a
  // regex over the text does not.
  function toHex(value: string): string | null {
    if (value.length === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context === null) return null;
    context.fillStyle = '#ff00ff';
    context.fillStyle = value;
    const accepted = context.fillStyle;
    context.fillStyle = '#00ff00';
    context.fillStyle = value;
    if (context.fillStyle !== accepted) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let names = $state<readonly string[]>([]);
  let themes = $state<ReadonlyMap<string, TokenThemeValues>>(new Map());
  let overrides = $state<Record<string, string>>({});
  let filter = $state('');
  let copied = $state(false);

  onMount(() => {
    const discovered = discoverTokens();
    themes = themeValues(discovered);
    names = discovered;
    overrides = { ...readOverrides() };
    applyOverrides(overrides);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const needle = $derived(filter.trim().toLocaleLowerCase());

  const visible = $derived(
    names.filter((name) => needle.length === 0 || name.toLocaleLowerCase().includes(needle)),
  );

  const groups = $derived(
    GROUP_ORDER.map((group) => ({
      group,
      tokens: visible.filter((name) => groupOf(name) === group),
    })).filter((entry) => entry.tokens.length > 0),
  );

  const changedCount = $derived(Object.keys(overrides).length);
  const cssBlock = $derived(toCssBlock(overrides));

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function currentValue(name: string): string {
    return overrides[name] ?? themes.get(name)?.light ?? '';
  }

  function flips(name: string): boolean {
    const value = themes.get(name);
    return value !== undefined && value.light !== value.dark;
  }

  function setToken(name: string, value: string): void {
    const next = { ...overrides, [name]: value };
    overrides = next;
    writeOverrides(next);
    applyOverrides(next);
  }

  function resetToken(name: string): void {
    const next = { ...overrides };
    delete next[name];
    overrides = next;
    writeOverrides(next);
    applyOverrides(next);
  }

  function resetAll(): void {
    overrides = {};
    writeOverrides({});
    applyOverrides({});
  }

  async function copyCss(): Promise<void> {
    try {
      await navigator.clipboard.writeText(cssBlock);
      copied = true;
      window.setTimeout(() => {
        copied = false;
      }, 1600);
    } catch {
      copied = false; // Clipboard refused; the block stays readable below.
    }
  }
</script>

<!-- Component content -->
<!-- This surface: token-playground — the design system's own editor. -->
<div class="tp">
  <header class="tp--head">
    <div>
      <p class="tp--eyebrow">Design system</p>
      <h1 class="tp--title">Token playground</h1>
      <p class="tp--lede">
        Edit a token and every story in this catalog re-renders against it. Changes stay in this
        browser until you reset them, and never touch the stylesheet.
      </p>
    </div>
    <div class="tp--actions">
      <span class="tp--count">{changedCount} changed</span>
      <button type="button" class="tp--button" onclick={copyCss} disabled={changedCount === 0}>
        {copied ? 'Copied' : 'Copy CSS'}
      </button>
      <button type="button" class="tp--button" onclick={resetAll} disabled={changedCount === 0}>
        Reset all
      </button>
    </div>
  </header>

  <label class="tp--filter">
    <span class="tp--label">Filter</span>
    <input type="search" placeholder="surface, accent, space…" bind:value={filter} />
  </label>

  {#if changedCount > 0}
    <section class="tp--export">
      <h2 class="tp--group-title">Paste into the stylesheet</h2>
      <pre class="tp--code">{cssBlock}</pre>
    </section>
  {/if}

  {#each groups as entry (entry.group)}
    <section class="tp--group">
      <h2 class="tp--group-title">{entry.group}</h2>
      <ul class="tp--list">
        {#each entry.tokens as name (name)}
          {@const value = currentValue(name)}
          {@const hex = toHex(value)}
          <li class="tp--row" class:is-changed={name in overrides}>
            <span class="tp--swatch" style={hex === null ? '' : `background:${hex}`}></span>
            <span class="tp--name">
              {name}
              {#if flips(name)}<span class="tp--flag" title="Light and dark resolve differently; an override pins both">flips</span>{/if}
            </span>
            {#if hex === null}
              <input
                class="tp--input"
                type="text"
                aria-label={name}
                {value}
                onchange={(event) => setToken(name, event.currentTarget.value)}
              />
            {:else}
              <input
                class="tp--colour"
                type="color"
                aria-label={name}
                value={hex}
                oninput={(event) => setToken(name, event.currentTarget.value)}
              />
              <code class="tp--value" title={value}>{value}</code>
            {/if}
            <button
              type="button"
              class="tp--reset"
              onclick={() => resetToken(name)}
              disabled={!(name in overrides)}
            >Reset</button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}

  {#if names.length === 0}
    <p class="tp--empty">No custom properties were readable from the loaded stylesheets.</p>
  {/if}
</div>

<style>
  /* Catalog chrome. It reads the tokens it edits, so a retune restyles this
     page too — which is the fastest way to notice a palette that stops
     working before it reaches a surface that matters. */
  .tp {
    display: grid;
    gap: var(--space-5, 1.5rem);
    max-inline-size: 60rem;
    margin: 0 auto;
    padding: var(--space-4, 1rem);
    color: var(--ink);
    font-family: var(--font-display, system-ui);
  }

  .tp--head {
    display: flex;
    flex-wrap: wrap;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-3, 0.75rem);
    padding-block-end: var(--space-3, 0.75rem);
    border-block-end: 1px solid var(--line);
  }

  .tp--eyebrow {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .tp--title {
    margin: 0.15rem 0 0.4rem;
    font-size: 1.6rem;
    font-weight: 620;
    letter-spacing: -0.02em;
  }

  .tp--lede {
    max-inline-size: 42ch;
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .tp--actions {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
  }

  .tp--count {
    color: var(--ink-muted);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .tp--button,
  .tp--reset {
    min-block-size: 2.75rem;
    padding-inline: var(--space-3, 0.75rem);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control, 0.625rem);
    background: var(--surface-raised);
    color: var(--ink);
    font-size: 0.78rem;
    font-weight: 650;
    cursor: pointer;
  }

  .tp--reset {
    min-block-size: 2rem;
    padding-inline: var(--space-2, 0.5rem);
    font-size: 0.7rem;
  }

  .tp--button:disabled,
  .tp--reset:disabled {
    color: var(--ink-disabled);
    cursor: default;
    opacity: 0.6;
  }

  .tp--filter {
    display: grid;
    gap: 0.3rem;
  }

  .tp--label {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .tp--filter input {
    min-block-size: 2.75rem;
    padding-inline: var(--space-3, 0.75rem);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control, 0.625rem);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }

  .tp--group-title {
    margin: 0 0 var(--space-2, 0.5rem);
    font-size: 0.95rem;
    font-weight: 620;
  }

  .tp--list {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tp--row {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: 0.3rem 0.4rem;
    border-radius: var(--radius-sm, 0.5rem);
  }

  .tp--row.is-changed {
    background: var(--accent-soft);
  }

  .tp--swatch {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border: 1px solid var(--line-hairline);
    border-radius: 0.35rem;
  }

  .tp--name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-inline-size: 0;
    overflow: hidden;
    color: var(--ink);
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.76rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tp--flag {
    flex: 0 0 auto;
    padding: 0.05rem 0.35rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--ink-muted);
    font-family: var(--font-display, system-ui);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* A resolved color-mix() prints far longer than a hex literal and would
     otherwise stretch its row out of line with every other one. The full text
     stays available through the row's title attribute. */
  .tp--value {
    max-inline-size: 16ch;
    overflow: hidden;
    color: var(--ink-muted);
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tp--input {
    min-block-size: 2rem;
    min-inline-size: 12rem;
    padding-inline: 0.5rem;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm, 0.5rem);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.72rem;
  }

  .tp--colour {
    inline-size: 3rem;
    block-size: 2rem;
    padding: 0;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm, 0.5rem);
    background: none;
    cursor: pointer;
  }

  .tp--code {
    margin: 0;
    padding: var(--space-3, 0.75rem);
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm, 0.5rem);
    background: var(--surface-code);
    color: var(--on-code);
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.75rem;
    line-height: 1.6;
  }

  .tp--empty {
    color: var(--ink-muted);
  }
</style>
