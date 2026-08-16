import { randomBytes } from 'node:crypto';

export const PLAN_ARTIFACT_KEY = 'pi-remote-plan-artifact';

// Projection caps mirror the relay's bounded display-string contract so every
// host publication passes the relay gate without truncation surprises.
export const PLAN_TITLE_CAP = 500;
export const PLAN_SUMMARY_CAP = 2_000;
export const PLAN_STEP_CAP = 10_000;
export const PLAN_APPROACH_CAP = 100;
export const PLAN_APPROACH_LABEL_CAP = 500;

export type PlanValidity = 'valid' | 'superseded' | 'invalid';

export interface PlanApproach {
  readonly label: string;
}

export interface PlanDraft {
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly unknown[];
  readonly approaches?: readonly PlanApproach[];
}

/** The allowlisted fields the relay parses; raw plan content never crosses. */
export interface PlanProjection {
  readonly planId: string;
  readonly planRevision: number;
  readonly planToken: string;
  readonly validity: PlanValidity;
  readonly title: string;
  readonly summary: string;
  readonly stepCount: number;
  readonly approachCount: number;
}

export interface PlanArtifact extends PlanProjection {
  /** Stable approach bindings for a later reviewed-execution handoff. */
  readonly approachIds: readonly string[];
}

/** The exact publication shape the relay's plan-status parser consumes. */
export interface PlanArtifactPublication {
  readonly type: 'extension_ui_request';
  readonly method: 'setPlan';
  readonly statusKey: typeof PLAN_ARTIFACT_KEY;
  readonly plan: PlanProjection;
}

export interface PlanArtifactAdapterOptions {
  readonly randomToken?: () => string;
  readonly randomPlanId?: () => string;
  readonly randomApproachId?: () => string;
}

interface BoundApproach {
  readonly id: string;
  readonly label: string;
}

/**
 * Host-side plan artifact authority. The adapter is the only producer of
 * structured plan publications: assistant prose can never mint a plan binding
 * because every publication flows through accept/invalidate. The opaque token
 * is freshly minted per revision and never derived from plan text.
 */
export class PlanArtifactAdapter {
  private artifact: PlanArtifact | null = null;
  private readonly randomToken: () => string;
  private readonly randomPlanId: () => string;
  private readonly randomApproachId: () => string;

  public constructor(options: PlanArtifactAdapterOptions = {}) {
    this.randomToken =
      options.randomToken ?? (() => `token_plan_binding_${randomBytes(16).toString('hex')}`);
    this.randomPlanId = options.randomPlanId ?? (() => `plan_${randomBytes(8).toString('hex')}`);
    this.randomApproachId =
      options.randomApproachId ?? (() => `approach_${randomBytes(6).toString('hex')}`);
  }

  public get(): PlanArtifact | null {
    return this.artifact;
  }

  /**
   * Accept a structured draft. The current binding is invalidated and published
   * as superseded BEFORE the replacement is published, so no window exists in
   * which an old valid binding could execute after feedback.
   */
  public accept(draft: PlanDraft): {
    readonly superseded: PlanArtifactPublication | null;
    readonly accepted: PlanArtifactPublication;
  } {
    const title = sanitizeProjectionField(draft.title, PLAN_TITLE_CAP);
    const summary = sanitizeProjectionField(draft.summary, PLAN_SUMMARY_CAP);
    if (title === null || summary === null) {
      throw new TypeError('A plan draft must project a non-empty bounded title and summary.');
    }
    const superseded =
      this.artifact !== null && this.artifact.validity === 'valid'
        ? this.invalidate('superseded')
        : null;
    const approaches = sanitizeApproaches(draft.approaches, this.randomApproachId);
    const artifact: PlanArtifact = {
      planId: this.artifact?.planId ?? this.randomPlanId(),
      planRevision: (this.artifact?.planRevision ?? 0) + 1,
      planToken: this.randomToken(),
      validity: 'valid',
      title,
      summary,
      stepCount: Math.min(draft.steps.length, PLAN_STEP_CAP),
      approachCount: approaches.length,
      approachIds: approaches.map((approach) => approach.id),
    };
    this.artifact = artifact;
    return { superseded, accepted: toPublication(artifact) };
  }

  /** Authoritative host invalidation; the binding stays non-executable. */
  public invalidate(validity: 'superseded' | 'invalid'): PlanArtifactPublication | null {
    const artifact = this.artifact;
    if (artifact === null || artifact.validity !== 'valid') return null;
    const invalidated: PlanArtifact = { ...artifact, validity };
    this.artifact = invalidated;
    return toPublication(invalidated);
  }
}

function toPublication(artifact: PlanArtifact): PlanArtifactPublication {
  const { approachIds: _approachIds, ...plan } = artifact;
  return {
    type: 'extension_ui_request',
    method: 'setPlan',
    statusKey: PLAN_ARTIFACT_KEY,
    plan,
  };
}

function sanitizeApproaches(
  approaches: readonly PlanApproach[] | undefined,
  randomApproachId: () => string,
): BoundApproach[] {
  const bound: BoundApproach[] = [];
  for (const approach of approaches ?? []) {
    if (bound.length >= PLAN_APPROACH_CAP) break;
    const label = sanitizeProjectionField(approach.label, PLAN_APPROACH_LABEL_CAP);
    if (label === null) continue;
    bound.push({ id: randomApproachId(), label });
  }
  return bound;
}

const CONTROL_OR_BIDI = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu;
const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const URL_PATTERN = /(?:https?|file):\/\/\S+/gi;
const POSIX_PATH_PATTERN =
  /(?:~|\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes))\/[^\s"'<>]*/g;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\(?:[^\\\s"'<>]+\\)*[^\\\s"'<>]*/g;

/**
 * Host-side bounded redaction: control characters are removed and secret/path
 * content is replaced with fixed markers before anything is published. The
 * result is also what the relay's safe-display gate accepts, so a publication
 * that passes here is never rejected as malformed downstream.
 */
function sanitizeProjectionField(value: string, cap: number): string | null {
  const cleaned = value
    .replace(CONTROL_OR_BIDI, '')
    .replace(SECRET_ASSIGNMENT_PATTERN, '[REDACTED_SECRET]')
    .replace(BEARER_PATTERN, '[REDACTED_SECRET]')
    .replace(URL_PATTERN, '[REDACTED_PATH]')
    .replace(POSIX_PATH_PATTERN, '[REDACTED_PATH]')
    .replace(WINDOWS_PATH_PATTERN, '[REDACTED_PATH]')
    .trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, cap);
}
