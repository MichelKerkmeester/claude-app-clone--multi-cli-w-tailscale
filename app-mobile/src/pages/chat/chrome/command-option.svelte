<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Slash Command Option (safe text-only row)
  // ───────────────────────────────────────────────────────────────────
  // One text-only listbox option. The canonical name is isolated LTR and
  // Never translated, matched graphemes are emphasized structurally, and
  // Every other line renders authoritative relay metadata as plain text.
  // Rows are never focusable, never nest interactive descendants, and a
  // Press only ever completes as an insertion request for an enabled row —
  // Disabled rows surface their disclosed reason instead. Any control or
  // Bidi-override character that somehow reaches the client is replaced for
  // Display only; insertion always uses the canonical DTO string.

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

  import './command-option.css';

  // ───────────────────────────────────────────────────────────────────
  // 8. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { command, active, onInsert, onDisabledPress }: CommandOptionProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 9. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  /** A pointer drag farther than this cancels activation (no accidental tap-drag inserts). */
  const DRAG_SLOP_PX = 10;

  // Non-reactive press tracking: a re-render must not reset the origin or the
  // Drag-cancel flag mid-gesture (useRef equivalent).
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
    // Focus stays in the textarea: no focus steal, no text selection, no
    // Long-press context menu, no iOS callout.
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
    // A completed row press is only ever an insertion request for an enabled row
    // (or a disclosed-reason announcement for a disabled one); it never submits.
    // @ds guardrail: fail-closed — Press requests insertion, never submission.
    if (command.enabled) {
      onInsert(command.name);
    } else if (command.disabledReason !== null) {
      onDisabledPress(command.disabledReason);
    }
  };

</script>

<!-- This row only restyles; its role, aria wiring, and virtual-focus hook are frozen. -->
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

<!-- @ds surface: slash-autocomplete — one text-only listbox option. Decomposed into this co-located CSS file;
     slash-option / name / match / hint / desc / meta and their states are owned solely by this
     component so they move with it. Values unchanged. -->
