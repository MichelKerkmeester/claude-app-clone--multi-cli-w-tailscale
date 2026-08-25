// ───────────────────────────────────────────────────────────────────
// MODULE: Bounded Effort Catalog
// ───────────────────────────────────────────────────────────────────
// Bounded effort copy: known IDs get exact labels; unknowns become ordinals, never raw host IDs.

// ───────────────────────────────────────────────────────────────────
// 1. KNOWN EFFORT IDS
// ───────────────────────────────────────────────────────────────────

export const KNOWN_EFFORT_IDS: readonly string[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

// ───────────────────────────────────────────────────────────────────
// 2. EFFORT CATALOG
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 3. SHARED UI STRINGS
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 4. LEVEL LOOKUP AND FORMATTERS
// ───────────────────────────────────────────────────────────────────

/** Known ID lookup; null when the client has no local label. */
export function effortLevelInfo(level: string): EffortLevelInfo | null {
  return EFFORT_CATALOG[level] ?? null;
}

/** One-based index in the host-advertised list, or null. */
export function effortOrdinal(level: string, advertised: readonly string[]): number | null {
  const index = advertised.indexOf(level);
  return index === -1 ? null : index + 1;
}

/** Row label: exact for known IDs, else bounded ordinal — never a raw host ID. */
export function effortRowName(level: string, advertised: readonly string[]): string {
  const known = EFFORT_CATALOG[level];
  if (known !== undefined) return known.label;
  const ordinal = effortOrdinal(level, advertised);
  return ordinal === null ? effortStrings.unknownLevel : `${effortStrings.unknownLevel} ${ordinal}`;
}

/** Row description: exact for known IDs; generic local line for unknowns. */
export function effortRowDescription(level: string): string {
  return EFFORT_CATALOG[level]?.description ?? effortStrings.unknownDescription;
}

/** Compact confirmed readout: known label, bounded ordinal, or em dash. */
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

// ───────────────────────────────────────────────────────────────────
// 5. MESSAGE AND ACCESSIBLE NAMES
// ───────────────────────────────────────────────────────────────────

/** Pending copy for the requested row and status line: `Applying High…`. */
export function applyingEffortMessage(level: string, advertised: readonly string[]): string {
  return `${effortStrings.applying} ${effortRowName(level, advertised)}…`;
}

/** Accepted announcement for a confirmed level; bounded exactly like every row name. */
export function effortConfirmedMessage(level: string, advertised: readonly string[]): string {
  return `${effortStrings.thinkingEffort} set to ${effortRowName(level, advertised)}.`;
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
