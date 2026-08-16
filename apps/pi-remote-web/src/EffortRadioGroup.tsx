// ───────────────────────────────────────────────────────────────────
// MODULE: Controlled Effort Radio Group
// ───────────────────────────────────────────────────────────────────
// One controlled React Aria radio per host-advertised level, rendered in
// the host's exact order and subset. The checked row is always the
// host-confirmed value; a pending request shows only on its own row and
// the group turns read-only (still focusable) with `aria-busy`. Every
// selection is an explicit mutation request — nothing here commits state.

import { Radio, RadioGroup } from 'react-aria-components';

import {
  applyingEffortMessage,
  effortRowAccessibleName,
  effortRowDescription,
  effortRowName,
  effortStrings,
} from './effort.js';

export interface EffortRadioGroupProps {
  /** Host-advertised levels, in host order and subset (never re-sorted). */
  readonly levels: readonly string[];
  /** Host-confirmed level; the checked row. */
  readonly confirmed: string | null;
  /** The level requested by the in-flight mutation, when pending. */
  readonly pendingLevel: string | null;
  /** True while a set_thinking_level mutation is in flight. */
  readonly isPending: boolean;
  /** True when authority or the phase forbids mutation (rows not focusable). */
  readonly isDisabled: boolean;
  /** Id of the visible section heading that names this group. */
  readonly labelledBy: string;
  /** Explicit row selection: the only path that may request a mutation. */
  readonly onSelect: (level: string) => void;
}

export function EffortRadioGroup({
  levels,
  confirmed,
  pendingLevel,
  isPending,
  isDisabled,
  labelledBy,
  onSelect,
}: EffortRadioGroupProps) {
  return (
    <RadioGroup
      aria-labelledby={labelledBy}
      ref={(element) => {
        // The group's own aria-busy state: pending rows are read-only but
        // the group stays focusable, so busy marks the in-flight window.
        if (element === null) return;
        if (isPending) element.setAttribute('aria-busy', 'true');
        else element.removeAttribute('aria-busy');
      }}
      className="effort-radio-group"
      data-pending={isPending ? 'true' : undefined}
      value={confirmed ?? null}
      isDisabled={isDisabled}
      isReadOnly={isPending}
      onChange={(level) => {
        // Read-only event guards: pending or disabled input is ignored even
        // if a stale event slips past the group's own read-only state.
        if (isPending || isDisabled) return;
        onSelect(level);
      }}
    >
      {levels.map((level, index) => (
        <EffortRadioRow
          key={level}
          level={level}
          ordinal={index + 1}
          advertised={levels}
          confirmed={confirmed}
          pendingLevel={pendingLevel}
          isPending={isPending}
        />
      ))}
    </RadioGroup>
  );
}

function EffortRadioRow({
  level,
  ordinal,
  advertised,
  confirmed,
  pendingLevel,
  isPending,
}: {
  readonly level: string;
  readonly ordinal: number;
  readonly advertised: readonly string[];
  readonly confirmed: string | null;
  readonly pendingLevel: string | null;
  readonly isPending: boolean;
}) {
  const isConfirmed = level === confirmed;
  const isRequested = isPending && level === pendingLevel;
  const name = effortRowName(level, advertised);
  const description = effortRowDescription(level);
  const descriptionId = `effort-row-description-${ordinal}`;
  return (
    <Radio
      value={level}
      className={`effort-radio-row${isRequested ? ' is-requested' : ''}`}
      aria-label={effortRowAccessibleName(level, advertised, isConfirmed, isRequested)}
      aria-describedby={descriptionId}
      style={{ minBlockSize: '44px' }}
    >
      <span className="effort-radio-row-main">
        <span className="effort-radio-row-label">{name}</span>
      </span>
      <span className="effort-radio-row-states">
        {isConfirmed && (
          <span className="effort-state-confirmed">
            <CheckGlyph />
            {effortStrings.confirmed}
          </span>
        )}
        {isRequested && (
          <span className="effort-state-requested">
            <SpinnerGlyph />
            {effortStrings.applying}
          </span>
        )}
      </span>
      <span id={descriptionId} className="effort-radio-row-description">
        {description}
        {isRequested && ` ${applyingEffortMessage(level, advertised)}`}
      </span>
    </Radio>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="m3 8 3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      aria-hidden="true"
      className="effort-spinner"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" opacity="0.3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
