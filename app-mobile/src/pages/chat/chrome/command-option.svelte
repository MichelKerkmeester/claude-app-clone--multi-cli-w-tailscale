<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Slash Command Option (safe text-only row)
  // ───────────────────────────────────────────────────────────────────
  // Text-only listbox row: LTR canonical name, virtual focus, insertion-only press; unsafe chars are display-escaped.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RankedHostCommand } from '$shared/commands/rank-host-commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

  /** The stable option id the composer's aria-activedescendant references. */
  export function optionId(name: string): string {
    return `slash-option-${name}`;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  /** Display-only escape: canonical names never contain these, but visible text is
   *  A security surface. The replacement is display-only; insertion always uses the
   *  Canonical DTO string unchanged.
   *  @ds guardrail: escaping — Unsafe/bidi-override characters are display-replaced. */
  export const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  export function escapeUnsafeName(name: string): string {
    return name.replace(UNSAFE_NAME_CHARACTERS, '\uFFFD');
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface CommandOptionProps {
    readonly command: RankedHostCommand;
    /** Whether this row carries the virtual focus (aria-activedescendant target). */
    readonly active: boolean;
    /** Completed-press insertion request for an enabled row. */
    readonly onInsert: (name: string) => void;
    /** Completed-press announcement for a disabled row's disclosed reason. */
    readonly onDisabledPress: (reason: string) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function sourceLabel(source: RankedHostCommand['source']): string {
    switch (source) {
      case 'extension':
        return 'Extension';
      case 'prompt':
        return 'Prompt';
      case 'skill':
        return 'Skill';
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 7. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { commandGraphemes } from '$shared/commands/rank-host-commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 8. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { command, active, onInsert, onDisabledPress }: CommandOptionProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 9. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  /** A pointer drag farther than this cancels activation (no accidental tap-drag inserts). */
  const DRAG_SLOP_PX = 10;

  // Non-reactive press tracking so re-renders do not reset mid-gesture.
  let pressOrigin: { x: number; y: number } | null = null;
  let dragged = false;

  // ───────────────────────────────────────────────────────────────────
  // 10. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const graphemes = $derived(commandGraphemes(escapeUnsafeName(command.name)));
  const matched = (index: number) =>
    command.matchRanges.some((range) => range.start <= index && index < range.end);

  // ───────────────────────────────────────────────────────────────────
  // 11. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const onPointerDown = (event: PointerEvent) => {
    // preventDefault keeps focus in the textarea (no steal, selection, or iOS callout).
    event.preventDefault();
    pressOrigin = { x: event.clientX, y: event.clientY };
    dragged = false;
  };
  // WebKit compatibility: cancel the mouse path as well as the pointer path.
  const onMouseDown = (event: MouseEvent) => {
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent) => {
    const origin = pressOrigin;
    if (origin === null) return;
    if (
      Math.abs(event.clientX - origin.x) > DRAG_SLOP_PX ||
      Math.abs(event.clientY - origin.y) > DRAG_SLOP_PX
    ) {
      dragged = true;
    }
  };
  const onClick = () => {
    if (dragged) {
      dragged = false;
      pressOrigin = null;
      return;
    }
    pressOrigin = null;
    // Press requests insertion or a disabled reason; never submission.
    // @ds guardrail: fail-closed — Press requests insertion, never submission.
    if (command.enabled) {
      onInsert(command.name);
    } else if (command.disabledReason !== null) {
      onDisabledPress(command.disabledReason);
    }
  };

</script>

<!-- Role, aria wiring, and virtual-focus hook are frozen. -->
<!-- @ds surface: slash-autocomplete -->
<!-- @ds guardrail: React-aria wiring — Option role, aria-selected/aria-disabled, data-focused virtual focus, and the focus-preserving press path. -->

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="option"
  id={optionId(command.name)}
  aria-selected={command.enabled ? active : undefined}
  aria-disabled={command.enabled ? undefined : true}
  data-focused={active || undefined}
  class="slash-option"
  onpointerdown={onPointerDown}
  onmousedown={onMouseDown}
  onpointermove={onPointerMove}
  onclick={onClick}
>
  <!-- @ds slot: label — the command name, match emphasis, and argument hint. -->
  <span class="slash-name-line">
    <bdi dir="ltr" translate="no" class="slash-name"
      >{'/'}{#each graphemes as grapheme, index (`${index}-${grapheme}`)}{#if matched(index)}<strong
          class="slash-match">{grapheme}</strong
        >{:else}<span>{grapheme}</span>{/if}{/each}</bdi
    >
    {#if command.argumentHint !== null && command.argumentHint !== undefined}
      <span class="slash-hint" dir="auto">
        {command.argumentHint}
      </span>
    {/if}
  </span>
  {#if command.enabled}
    {#if command.description !== null}
      <span class="slash-desc" dir="auto">
        {command.description}
      </span>
    {/if}
  {:else}
    <!-- @ds state: disabled-with-reason — a disabled row surfaces its disclosed reason. -->
    <span class="slash-disabled-reason" dir="auto">
      {command.disabledReason !== null ? command.disabledReason : 'Unavailable: not disclosed'}
    </span>
  {/if}
  <!-- @ds slot: binding — the authoritative source binding and confirmation hint. -->
  <span class="slash-meta">
    <span class="slash-source">{sourceLabel(command.source)}</span>
    {#if command.requiresConfirmation}<span class="slash-confirm">Asks first</span>{/if}
  </span>
</div>

<!-- @ds surface: slash-autocomplete — one text-only listbox option. Decomposed into this scoped block;
     slash-option / name / match / hint / desc / meta and their states are owned solely by this
     component so they move with it. Values unchanged. -->
<style>
  /* @ds slot: label — the option row and its name/match/argument-hint lines. */
  /* @ds state: enabled — an insertable row; default row presentation. */
  .slash-option {
    display: grid;
    gap: 2px;
    min-block-size: 56px;
    padding: 9px 9px 9px 12px;
    border-inline-start: 3px solid transparent;
    border-radius: 10px;
    color: var(--slash-ink);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    cursor: pointer;
    transition: background-color 80ms linear;
  }

  /* @ds state: active — the virtual-focus row (aria-activedescendant). Not
     colour-only: it keeps its ink rail plus outline. */
  .slash-option[data-focused] {
    background: var(--slash-selection);
    border-inline-start-color: var(--slash-ink);
    outline: 2px solid var(--slash-ink);
    outline-offset: -2px;
  }

  /* @ds state: disabled-with-reason — a row that only offers its disclosed reason. */
  .slash-option[aria-disabled='true'] {
    cursor: default;
  }

  .slash-name-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 8px;
    min-inline-size: 0;
  }

  .slash-name {
    overflow-wrap: anywhere;
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    letter-spacing: -0.01em;
  }

  .slash-match {
    font-weight: 700;
  }

  .slash-option[aria-disabled='true'] .slash-name {
    color: var(--slash-muted);
  }

  .slash-hint {
    color: var(--slash-muted);
    font-size: 12px;
    line-height: 17px;
    font-variant-numeric: tabular-nums;
  }

  /* @ds slot: label · disabled-reason — the row's secondary line: a description
     on enabled rows, the disclosed reason on disabled rows. */
  .slash-desc,
  .slash-disabled-reason {
    overflow-wrap: anywhere;
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 18px;
    color: var(--slash-muted);
  }

  /* @ds slot: binding — the authoritative source binding and confirmation hint. */
  .slash-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 11px;
    line-height: 16px;
    color: var(--slash-muted);
  }

  .slash-confirm {
    color: var(--slash-accent);
    font-weight: 650;
  }

  /* @ds edit: contrast — system-wide prefers-contrast primitive: borders carry the hierarchy the palette
     otherwise implies with fill, using the frozen tokens unchanged. */
   /* @ds guardrail: do-not-edit — The high-contrast re-render is an accessibility guarantee; never drop the border/outline carry for interactive and raised surfaces. */
  @media (prefers-contrast: more) {
    .slash-option[data-focused] {
      outline-width: 3px;
    }
  }

  /* @ds edit: contrast — system-wide forced-colors primitive: the scoped palettes yield to the user's
     system scheme (Canvas / CanvasText / Highlight). */
   /* @ds guardrail: do-not-edit — Forced-colors yield is an accessibility guarantee; never restore a hard-coded surface/ink over the system scheme. */
  @media (forced-colors: active) {
    .slash-option[data-focused] {
      outline: 2px solid Highlight;
      outline-offset: -2px;
      border-inline-start-color: Highlight;
    }
  }
</style>
