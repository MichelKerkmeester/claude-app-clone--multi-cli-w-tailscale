// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Status and Artifact Parsing
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  isOpaqueId,
  isOpaqueToken,
  type PlanValidityValue,
  type RuntimeMode,
} from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const PLAN_STATUS_KEY = 'pi-remote-plan-mode';
export const PLAN_ARTIFACT_KEY = 'pi-remote-plan-artifact';

const PLAN_TITLE_CAP = 500;
const PLAN_SUMMARY_CAP = 2_000;
const PLAN_STEP_CAP = 10_000;
const PLAN_APPROACH_CAP = 100;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A plan artifact exactly as the host published it, before any DTO projection. */
export interface ParsedPlanArtifact {
  readonly planId: string;
  readonly planRevision: number;
  readonly planToken: string;
  readonly validity: Exclude<PlanValidityValue, 'none'>;
  readonly title: string;
  readonly summary: string;
  readonly stepCount: number;
  readonly approachCount: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * True when the record is an extension runtime error. Extension health is
 * host-authoritative: an unhealthy extension must never read as Build.
 */
export function isPlanExtensionError(record: unknown): boolean {
  return isRecord(record) && record.type === 'extension_error';
}

/**
 * Parse the only mode/status publication the relay trusts. Every other shape is
 * ignored (null) or mapped to `unknown`; a malformed or unhealthy status can
 * never be read as Build.
 */
export function parsePlanStatus(record: unknown): RuntimeMode | null {
  if (
    !isRecord(record) ||
    record.type !== 'extension_ui_request' ||
    record.method !== 'setStatus' ||
    record.statusKey !== PLAN_STATUS_KEY
  ) {
    return null;
  }
  const statusText = record.statusText;
  if (statusText === 'build' || statusText === 'plan' || statusText === 'executing-plan') {
    return statusText;
  }
  return 'unknown';
}

/** True when the record is a plan artifact publication of any quality. */
export function isPlanArtifactPublication(record: unknown): boolean {
  return (
    isRecord(record) &&
    record.type === 'extension_ui_request' &&
    record.method === 'setPlan' &&
    record.statusKey === PLAN_ARTIFACT_KEY
  );
}

/**
 * Parse the pinned structured plan artifact publication. Malformed or foreign
 * publications return null so the relay fails closed instead of guessing a plan.
 */
export function parsePlanArtifact(record: unknown): ParsedPlanArtifact | null {
  if (
    !isRecord(record) ||
    record.type !== 'extension_ui_request' ||
    record.method !== 'setPlan' ||
    record.statusKey !== PLAN_ARTIFACT_KEY ||
    !isRecord(record.plan)
  ) {
    return null;
  }
  const plan = record.plan;
  if (
    !isOpaqueId(plan.planId) ||
    !isNonNegativeSafeInteger(plan.planRevision) ||
    !isOpaqueToken(plan.planToken) ||
    !isSafeDisplayString(plan.title, PLAN_TITLE_CAP) ||
    !isSafeDisplayString(plan.summary, PLAN_SUMMARY_CAP) ||
    !isBoundedNonNegativeInteger(plan.stepCount, PLAN_STEP_CAP) ||
    !isBoundedNonNegativeInteger(plan.approachCount, PLAN_APPROACH_CAP) ||
    (plan.validity !== 'valid' && plan.validity !== 'superseded' && plan.validity !== 'invalid')
  ) {
    return null;
  }
  return {
    planId: plan.planId,
    planRevision: plan.planRevision,
    planToken: plan.planToken,
    validity: plan.validity,
    title: plan.title,
    summary: plan.summary,
    stepCount: plan.stepCount,
    approachCount: plan.approachCount,
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBoundedNonNegativeInteger(value: unknown, maximum: number): value is number {
  return isNonNegativeSafeInteger(value) && value <= maximum;
}

function isSafeDisplayString(value: unknown, max: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) &&
    !/(?:https?|file):\/\/|(?:^|\s)\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes)\/|\b[A-Za-z]:\\|\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]|\bBearer\s+/iu.test(
      value,
    )
  );
}
