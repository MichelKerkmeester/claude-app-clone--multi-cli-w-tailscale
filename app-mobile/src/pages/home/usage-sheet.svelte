<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Account Usage Detail Sheet
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Button from '$shared/primitives/button/button.svelte';
  import {
    barColor,
    barFillPercent,
    formatUsageResetCountdown,
    hasUsageCapability,
    percentNumber,
    percentText,
    projectUsageWindow,
    readUsageDisplayMode,
    selectGatingWindow,
    severityColor,
    toggleUsageDisplayMode,
    writeUsageDisplayMode,
    type AccountUsagePayload,
    type UsageReading,
    type UsageWindowProjection,
    type UsageDisplayMode,
  } from '$shared/format/usage-format.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS AND STATE
  // ───────────────────────────────────────────────────────────────────

  export interface UsageSheetProps {
    readonly usage: AccountUsagePayload | null | undefined;
    readonly open: boolean;
    readonly now?: number;
    readonly onClose: () => void;
  }

  let { usage, open, now, onClose }: UsageSheetProps = $props();
  let displayMode = $state<UsageDisplayMode>(readUsageDisplayMode());

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const currentNow = $derived(now ?? Date.now());
  const gatingWindow = $derived(
    hasUsageCapability(usage) ? selectGatingWindow(usage.windows) : null,
  );
  const rows = $derived(
    hasUsageCapability(usage)
      ? usage.windows.map((window) => ({
          window,
          projection: projectUsageWindow(window, currentNow),
        }))
      : [],
  );

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function toggleDisplay(): void {
    const next = toggleUsageDisplayMode(displayMode);
    displayMode = next;
    writeUsageDisplayMode(next);
  }

  function meterStyle(reading: UsageReading): string {
    const color = barColor(100 - reading.usedPercent);
    if (color === null) return '';
    const severity = severityColor(reading.severity);
    const severityDeclaration = severity === null ? '' : ` --usage-severity-color: ${severity};`;
    return `--usage-fill: ${barFillPercent(reading.usedPercent, displayMode)}%; --usage-color: ${color};${severityDeclaration}`;
  }

  function valueLabel(projection: UsageWindowProjection): string {
    if (projection.state !== 'shown' || projection.reading === null) return '';
    return percentText(projection.reading.usedPercent, displayMode);
  }

  function resetLabel(reading: UsageReading): string {
    return formatUsageResetCountdown(reading.resetsAt, currentNow);
  }
</script>

{#if open && gatingWindow !== null}
  <!-- Usage detail surface -->
  <dialog
    open
    id="usage-sheet"
    class="usage-sheet"
    aria-labelledby="usage-sheet-heading"
  >
    <div class="usage-sheet--panel">
      <header class="usage-sheet--header">
        <div>
          <p class="surface--eyebrow">Account usage</p>
          <h2 id="usage-sheet-heading" data-usage-headline="true">{gatingWindow.label}</h2>
        </div>
        <Button class="usage--close" aria-label="Close account usage" onclick={onClose}>Close</Button>
      </header>

      <div class="usage-sheet--toolbar">
        <p class="usage--headline-note">The host marked this window as the next gating limit.</p>
        <Button
          class="usage--display-mode"
          aria-pressed={displayMode === 'remaining'}
          onclick={toggleDisplay}
        >
          {displayMode === 'used' ? 'Show remaining' : 'Show used'}
        </Button>
      </div>

      <div class="usage--windows">
        {#each rows as row (row.window.id)}
          <article
            class="usage--window"
            data-usage-window={row.window.id}
            data-usage-state={row.projection.state}
            data-usage-stale={row.projection.stale ? 'true' : undefined}
          >
            <div class="usage--window-header">
              <h3>{row.window.label}</h3>
              {#if row.window.isActive === true || row.window.primary === true}
                <span class="usage--gating-label">Gating window</span>
              {/if}
            </div>
            {#if row.projection.state === 'loading'}
              <p class="usage--status" role="status">Loading usage</p>
            {:else if row.projection.state === 'unavailable'}
              <p class="usage--status" role="status">Usage unavailable</p>
            {:else if row.projection.reading !== null}
              <div class="usage--reading">
                <div
                  class="usage--meter"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={percentNumber(row.projection.reading.usedPercent, displayMode)}
                  aria-label={`${row.window.label} ${valueLabel(row.projection)}`}
                  style={meterStyle(row.projection.reading)}
                >
                  <span class="usage--meter-fill"></span>
                </div>
                <div class="usage--reading-line">
                  <strong>{valueLabel(row.projection)}</strong>
                  {#if row.projection.stale}
                    <span class="usage--stale-label">Stale</span>
                  {:else}
                    <span class="usage--current-label">Current</span>
                  {/if}
                </div>
                {#if resetLabel(row.projection.reading) !== ''}
                  <p class="usage--reset">{resetLabel(row.projection.reading)}</p>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </div>
  </dialog>
{/if}

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. SHEET FRAME
  ─────────────────────────────────────────────────────────────────── */
  /* Keeps the detail sheet above the home roster without changing host state. */
  .usage-sheet {
    position: fixed;
    z-index: 20;
    margin: 0;
    inset: 0;
    display: grid;
    align-items: end;
    background: color-mix(in srgb, var(--ink) 32%, transparent);
  }

  /* Gives the sheet a bounded reading width on wide screens. */
  .usage-sheet--panel {
    width: min(100%, 48rem);
    max-height: min(90dvh, 44rem);
    margin-inline: auto;
    padding: var(--space-6);
    overflow-y: auto;
    border: 1px solid var(--line-strong);
    border-bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 -1rem 3rem color-mix(in srgb, var(--ink) 16%, transparent);
  }

  /* Separates the sheet title from its close control. */
  .usage-sheet--header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  /* ───────────────────────────────────────────────────────────────────
     2. SHEET CONTROLS
  ─────────────────────────────────────────────────────────────────── */
  /* Keeps the local display preference separate from host-provided values. */
  .usage-sheet--toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-5);
  }

  /* Explains why this headline is not selected by the client. */
  .usage--headline-note {
    margin: 0;
    color: var(--ink-secondary);
    font-size: 0.76rem;
    line-height: 1.45;
  }

  /* Keeps the close control touch-sized and discoverable. */
  :global(.usage--close),
  :global(.usage--display-mode) {
    min-block-size: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-raised);
    color: var(--ink-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  /* Makes keyboard focus visible without relying on color alone. */
  :global(.usage--close[data-focus-visible]),
  :global(.usage--display-mode[data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  /* ───────────────────────────────────────────────────────────────────
     3. WINDOW STATES
  ─────────────────────────────────────────────────────────────────── */
  /* Keeps windows readable as independent loading, unavailable, or shown states. */
  .usage--windows {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  /* Gives each host window a stable surface for its value and status. */
  .usage--window {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
  }

  /* Aligns the host label and marker without changing their meaning. */
  .usage--window-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* Keeps the window heading compact inside the sheet. */
  .usage--window-header h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  /* Makes the host gating marker legible without using it as a color-only signal. */
  .usage--gating-label {
    color: var(--accent-ink);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Gives loading and unavailable states explicit text instead of a zero meter. */
  .usage--status {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.8rem;
  }

  /* ───────────────────────────────────────────────────────────────────
     4. USAGE READING
  ─────────────────────────────────────────────────────────────────── */
  /* Pairs the meter with its host-supplied quantity and freshness state. */
  .usage--reading {
    display: grid;
    gap: var(--space-2);
  }

  /* Keeps the meter track visible when the accepted percentage is small. */
  .usage--meter {
    position: relative;
    height: 0.7rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--line);
  }

  /* Uses the selected wording for fill while keeping severity on its own token path. */
  .usage--meter-fill {
    display: block;
    width: var(--usage-fill);
    height: 100%;
    border-radius: inherit;
    background: var(--usage-color);
  }

  /* Keeps the value and stale marker readable in one line. */
  .usage--reading-line {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  /* Uses the host severity token only as a supporting accent beside text. */
  .usage--stale-label,
  .usage--current-label {
    color: var(--usage-severity-color, var(--ink-muted));
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Keeps a reset timestamp subordinate to the quota value. */
  .usage--reset {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.72rem;
  }

  @media (max-width: 39rem) {
    /* Lets the sheet use the full phone width while preserving readable padding. */
    .usage-sheet--panel {
      padding: var(--space-4);
    }

    /* Stacks the explanation and local preference on narrow screens. */
    .usage-sheet--toolbar {
      align-items: start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Keeps the overlay static for users who request reduced motion. */
    .usage-sheet,
    .usage-sheet--panel {
      scroll-behavior: auto;
    }
  }
</style>
