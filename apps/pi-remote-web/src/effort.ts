// ───────────────────────────────────────────────────────────────────
// MODULE: Bounded Effort Catalog
// ───────────────────────────────────────────────────────────────────
// The single source for visible and accessible effort copy. Seven known
// IDs carry exact local labels and descriptions; anything else renders
// as a bounded ordinal derived from its position in the host-advertised
// list, so raw host IDs can never reach copy. The host's advertised
// order and subset are always preserved by callers, never re-sorted here.

export const KNOWN_EFFORT_IDS: readonly string[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

export interface EffortLevelInfo {
  readonly label: string;
  readonly description: string;
}

const EFFORT_CATALOG: Readonly<Record<string, EffortLevelInfo>> = {
  off: {
    label: 'Off',
    description: 'No explicit reasoning; fastest for simple checks.',
  },
  minimal: {
    label: 'Minimal',
    description: 'Brief reasoning with a quick response.',
  },
  low: {
    label: 'Low',
    description: 'Light reasoning for routine work.',
  },
  medium: {
    label: 'Medium',
    description: 'Balanced reasoning depth and speed.',
  },
  high: {
    label: 'High',
    description: 'Deep reasoning for complex coding work.',
  },
  xhigh: {
    label: 'Extra high',
    description: 'Very deep reasoning for long-running agent work.',
  },
  max: {
    label: 'Max',
    description: 'Maximum available reasoning; slowest and highest use.',
  },
};

export const effortStrings = {
  thinkingEffort: 'Thinking effort',
  unknownLevel: 'Host-defined level',
  unknownDescription: 'Host-defined reasoning level.',
  confirmed: 'Confirmed',
  applying: 'Applying',
  applyingEllipsis: 'Applying…',
  checking: 'Checking…',
  streaming: 'Available when the current turn ends.',
  offOnly: 'This model does not expose adjustable reasoning.',
  empty: 'Pi reported no effort controls.',
  stale: 'The host runtime changed. Refreshed.',
  reconcile: 'Reconcile',
  changeModel: 'Change model',
  closeSheet: 'Close sheet',
  unconfirmed: '—',
} as const;

/** Catalog lookup only; null for IDs this client does not know. */
export function effortLevelInfo(level: string): EffortLevelInfo | null {
  return EFFORT_CATALOG[level] ?? null;
}

/** One-based position of a level within the host-advertised list, or null. */
export function effortOrdinal(level: string, advertised: readonly string[]): number | null {
  const index = advertised.indexOf(level);
  return index === -1 ? null : index + 1;
}

/**
 * Visible name for one advertised level: the exact local label for known
 * IDs, or a bounded ordinal built from its position in the advertised
 * list. A raw host ID can never pass through this formatter.
 */
export function effortRowName(level: string, advertised: readonly string[]): string {
  const known = EFFORT_CATALOG[level];
  if (known !== undefined) return known.label;
  const ordinal = effortOrdinal(level, advertised);
  return ordinal === null ? effortStrings.unknownLevel : `${effortStrings.unknownLevel} ${ordinal}`;
}

/**
 * Bounded description for one advertised level. Known IDs use the exact
 * local description; unknown IDs get one generic local line and never
 * echo host text.
 */
export function effortRowDescription(level: string): string {
  return EFFORT_CATALOG[level]?.description ?? effortStrings.unknownDescription;
}

/**
 * Compact readout for a confirmed value: the exact local label, a bounded
 * ordinal for unknown-but-advertised IDs, or an em dash when there is no
 * confirmed value (or it is absent from the advertised list).
 */
export function effortTriggerText(
  level: string | null | undefined,
  advertised: readonly string[],
): string {
  if (level === null || level === undefined || level.length === 0) return effortStrings.unconfirmed;
  const known = EFFORT_CATALOG[level];
  if (known !== undefined) return known.label;
  const ordinal = effortOrdinal(level, advertised);
  return ordinal === null ? effortStrings.unconfirmed : `${effortStrings.unknownLevel} ${ordinal}`;
}

/** Pending copy for the requested row and status line: `Applying High…`. */
export function applyingEffortMessage(level: string, advertised: readonly string[]): string {
  return `${effortStrings.applying} ${effortRowName(level, advertised)}…`;
}

/** Localized accessible name for one effort row, states included. */
export function effortRowAccessibleName(
  level: string,
  advertised: readonly string[],
  isConfirmed: boolean,
  isRequested: boolean,
): string {
  return [
    effortRowName(level, advertised),
    isConfirmed ? effortStrings.confirmed : null,
    isRequested ? effortStrings.applying : null,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(', ');
}

/** Localized accessible name for the header's model + effort readout trigger. */
export function modelEffortTriggerName(
  modelLabel: string,
  modelProvider: string,
  effortText: string,
): string {
  return `Model, ${modelLabel}, ${modelProvider}, ${effortStrings.thinkingEffort}, ${effortText}`;
}

/** Localized accessible name for a compact effort summary trigger. */
export function effortTriggerName(effortText: string): string {
  return `${effortStrings.thinkingEffort}, ${effortText}`;
}
