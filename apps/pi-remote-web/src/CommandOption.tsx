// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Command Option (safe text-only row)
// ───────────────────────────────────────────────────────────────────
// One text-only listbox option. The canonical name is isolated LTR and
// never translated, matched graphemes are emphasized structurally, and
// every other line renders authoritative relay metadata as plain text.
// Rows are never focusable, never nest interactive descendants, and a
// press only ever completes as an insertion request for an enabled row —
// disabled rows surface their disclosed reason instead. Any control or
// bidi-override character that somehow reaches the client is replaced for
// display only; insertion always uses the canonical DTO string.

import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';

import { commandGraphemes, type RankedHostCommand } from './rankHostCommands.js';

/** The stable option id the composer's aria-activedescendant references. */
export function optionId(name: string): string {
  return `slash-option-${name}`;
}

/** Display-only escape: canonical names never contain these, but visible text is
 *  a security surface. The replacement is display-only; insertion always uses the
 *  canonical DTO string unchanged.
 *  @ds guardrail: escaping — unsafe/bidi-override characters are display-replaced. */
const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

export function escapeUnsafeName(name: string): string {
  return name.replace(UNSAFE_NAME_CHARACTERS, '\uFFFD');
}

export interface CommandOptionProps {
  readonly command: RankedHostCommand;
  /** Whether this row carries the virtual focus (aria-activedescendant target). */
  readonly active: boolean;
  /** Completed-press insertion request for an enabled row. */
  readonly onInsert: (name: string) => void;
  /** Completed-press announcement for a disabled row's disclosed reason. */
  readonly onDisabledPress: (reason: string) => void;
}

/** A pointer drag farther than this cancels activation (no accidental tap-drag inserts). */
const DRAG_SLOP_PX = 10;

export function CommandOption({ command, active, onInsert, onDisabledPress }: CommandOptionProps) {
  const { name, description, source, enabled, disabledReason, requiresConfirmation, argumentHint } =
    command;
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Focus stays in the textarea: no focus steal, no text selection, no
    // long-press context menu, no iOS callout.
    event.preventDefault();
    pressOriginRef.current = { x: event.clientX, y: event.clientY };
    draggedRef.current = false;
  };
  // WebKit compatibility: cancel the mouse path as well as the pointer path.
  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = pressOriginRef.current;
    if (origin === null) return;
    if (
      Math.abs(event.clientX - origin.x) > DRAG_SLOP_PX ||
      Math.abs(event.clientY - origin.y) > DRAG_SLOP_PX
    ) {
      draggedRef.current = true;
    }
  };
  const onClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      pressOriginRef.current = null;
      return;
    }
    pressOriginRef.current = null;
    // A completed row press is only ever an insertion request for an enabled row
    // (or a disclosed-reason announcement for a disabled one); it never submits.
    // @ds guardrail: fail-closed — press requests insertion, never submission.
    if (enabled) {
      onInsert(name);
    } else if (disabledReason !== null) {
      onDisabledPress(disabledReason);
    }
  };

  const graphemes = commandGraphemes(escapeUnsafeName(name));
  const matched = (index: number) =>
    command.matchRanges.some((range) => range.start <= index && index < range.end);

  return (
    // This row only restyles; its role, aria wiring, and virtual-focus hook are frozen.
    // @ds surface: slash-autocomplete
    // @ds guardrail: react-aria wiring — option role, aria-selected/aria-disabled,
    //                data-focused virtual focus, and the focus-preserving press path.
    <div
      role="option"
      id={optionId(name)}
      aria-selected={enabled ? active : undefined}
      aria-disabled={enabled ? undefined : true}
      data-focused={active || undefined}
      className="slash-option"
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
    >
      {/* @ds slot: label — the command name, match emphasis, and argument hint. */}
      <span className="slash-name-line">
        <bdi dir="ltr" translate="no" className="slash-name">
          {'/'}
          {graphemes.map((grapheme, index) =>
            matched(index) ? (
              <strong className="slash-match" key={`${index}-${grapheme}`}>
                {grapheme}
              </strong>
            ) : (
              <span key={`${index}-${grapheme}`}>{grapheme}</span>
            ),
          )}
        </bdi>
        {argumentHint !== null && argumentHint !== undefined && (
          <span className="slash-hint" dir="auto">
            {argumentHint}
          </span>
        )}
      </span>
      {enabled ? (
        description !== null && (
          <span className="slash-desc" dir="auto">
            {description}
          </span>
        )
      ) : (
        // @ds state: disabled-with-reason — a disabled row surfaces its disclosed reason.
        <span className="slash-disabled-reason" dir="auto">
          {disabledReason !== null ? disabledReason : 'Unavailable: not disclosed'}
        </span>
      )}
      {/* @ds slot: binding — the authoritative source binding and confirmation hint. */}
      <span className="slash-meta">
        <span className="slash-source">{sourceLabel(source)}</span>
        {requiresConfirmation && <span className="slash-confirm">Asks first</span>}
      </span>
    </div>
  );
}

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
