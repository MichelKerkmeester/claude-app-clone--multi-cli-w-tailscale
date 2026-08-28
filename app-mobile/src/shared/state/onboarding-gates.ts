// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Onboarding Gates
// ───────────────────────────────────────────────────────────────────

// Onboarding decisions only shape this device's first-run guidance. They are
// persisted separately from authenticated state so they cannot be mistaken for
// a host-confirmed pairing or session decision.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const ONBOARDING_STORAGE_KEY = 'pi-remote.onboarding-gates';
const ONBOARDING_SCHEMA_VERSION = 1;

export const ONBOARDING_GATES_STORAGE_KEY = ONBOARDING_STORAGE_KEY;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface OnboardingGateOption {
  readonly value: string;
  readonly label: string;
}

export interface OnboardingGate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly options: readonly OnboardingGateOption[];
  readonly decision?: string | null;
  readonly available?: boolean;
  readonly noOp?: boolean;
}

export type OnboardingDecisions = Readonly<Record<string, string>>;

export interface OnboardingGateState {
  readonly available: boolean;
  readonly decisions: OnboardingDecisions;
}

// ───────────────────────────────────────────────────────────────────
// 3. DEFAULT GATES
// ───────────────────────────────────────────────────────────────────

// The choice changes only the guidance on this device and leaves pairing
// confirmation with the authentication boundary.
export const DEFAULT_ONBOARDING_GATES: readonly OnboardingGate[] = [
  {
    id: 'pairing-guidance',
    title: 'Choose your pairing guidance',
    description:
      'Choose how much help you want while pairing this device. You can change this later.',
    options: [
      { value: 'guided', label: 'Show guided pairing help' },
      { value: 'direct', label: 'Go straight to pairing' },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. STORAGE
// ───────────────────────────────────────────────────────────────────

function emptyState(available: boolean): OnboardingGateState {
  return { available, decisions: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStoredDecisions(): OnboardingGateState {
  if (typeof window === 'undefined') return emptyState(false);

  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw === null) return emptyState(true);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== ONBOARDING_SCHEMA_VERSION) {
      return emptyState(false);
    }
    if (!isRecord(parsed.decisions)) return emptyState(false);

    const entries = Object.entries(parsed.decisions);
    if (
      entries.some(
        ([gateId, decision]) => gateId.trim().length === 0 || typeof decision !== 'string',
      )
    ) {
      return emptyState(false);
    }
    const decisions: Record<string, string> = {};
    for (const [gateId, decision] of entries) {
      decisions[gateId] = decision as string;
    }
    return { available: true, decisions };
  } catch {
    return emptyState(false);
  }
}

function persistDecisions(decisions: OnboardingDecisions): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ version: ONBOARDING_SCHEMA_VERSION, decisions }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Read only this device's persisted onboarding choices. */
export function readOnboardingGateState(): OnboardingGateState {
  return readStoredDecisions();
}

/** Remove the local choices so the guidance can be selected again later. */
export function clearOnboardingDecisions(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // A storage failure cannot strand the in-memory wizard.
  }
}

/** Persist one local choice; the caller keeps its in-memory transition. */
export function persistOnboardingDecision(gateId: string, decision: string): boolean {
  if (gateId.trim().length === 0 || decision.trim().length === 0) return false;
  const current = readStoredDecisions();
  if (!current.available) return false;
  return persistDecisions(setOnboardingDecision(current.decisions, gateId, decision));
}

// ───────────────────────────────────────────────────────────────────
// 5. DECISION FLOW
// ───────────────────────────────────────────────────────────────────

/** Apply a local choice without reading or writing host state. */
export function setOnboardingDecision(
  decisions: OnboardingDecisions,
  gateId: string,
  decision: string,
): OnboardingDecisions {
  if (gateId.trim().length === 0 || decision.trim().length === 0) return decisions;
  return { ...decisions, [gateId]: decision };
}

/** Determine whether a gate has nothing useful for the person to do. */
export function isOnboardingGateSkipped(
  gate: OnboardingGate,
  decisions: OnboardingDecisions,
): boolean {
  if (gate.noOp === true || gate.available === false || gate.options.length === 0) return true;
  if (typeof gate.decision === 'string' && gate.decision.trim().length > 0) return true;
  const decision = decisions[gate.id];
  return typeof decision === 'string' && decision.trim().length > 0;
}

/** Return the next actionable gate, or the terminal state when none remain. */
export function getNextOnboardingGate(
  gates: readonly OnboardingGate[],
  decisions: OnboardingDecisions,
  entryGateId?: string,
): OnboardingGate | null {
  const entryIndex =
    entryGateId === undefined ? -1 : gates.findIndex((gate) => gate.id === entryGateId);
  const startIndex = entryIndex < 0 ? 0 : entryIndex;

  for (let index = startIndex; index < gates.length; index += 1) {
    const gate = gates[index];
    if (gate !== undefined && !isOnboardingGateSkipped(gate, decisions)) return gate;
  }
  return null;
}

/** Report whether an entry point can reach the terminal state without a dead screen. */
export function onboardingFlowIsComplete(
  gates: readonly OnboardingGate[],
  decisions: OnboardingDecisions,
  entryGateId?: string,
): boolean {
  return getNextOnboardingGate(gates, decisions, entryGateId) === null;
}
