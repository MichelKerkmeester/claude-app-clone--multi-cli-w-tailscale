import { Button, Heading } from 'react-aria-components';
import type { RefObject } from 'react';

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

// @ds surface: plan-ready-card — live validated plan summary + review entry.
// @ds guardrail: do-not-edit — isReviewablePlanArtifact gates rendering on live + newest + valid,
// and canReview disables the review CTA until the host binds the plan. Not designer-editable.
const PLAN_TITLE_DISPLAY_CAP = 160;

export interface PlanReadyCardProps {
  readonly artifact: PlanArtifactDto | null | undefined;
  /** A live host snapshot, never a service-worker or transcript cache value. */
  readonly isLive: boolean;
  /** Older revisions remain history-only even if a caller still holds them. */
  readonly isNewest?: boolean;
  /** False until the live session has an opaque binding in memory. */
  readonly canReview?: boolean;
  readonly onReview: () => void;
  readonly reviewButtonRef?: RefObject<HTMLButtonElement | null>;
}

// @ds guardrail: do-not-edit — the reviewability gate (live · newest · valid) — not designer-editable.
export function isReviewablePlanArtifact(
  artifact: PlanArtifactDto | null | undefined,
  isLive: boolean,
  isNewest = true,
): artifact is PlanArtifactDto {
  return (
    artifact !== null &&
    artifact !== undefined &&
    isLive &&
    isNewest &&
    artifact.validity === 'valid'
  );
}

export function PlanReadyCard({
  artifact,
  isLive,
  isNewest = true,
  canReview = true,
  onReview,
  reviewButtonRef,
}: PlanReadyCardProps) {
  if (!isReviewablePlanArtifact(artifact, isLive, isNewest)) return null;

  const title = artifact.title.slice(0, PLAN_TITLE_DISPLAY_CAP);
  return (
    <article className="plan-ready-card" aria-labelledby="plan-ready-title" data-plan-ready="true">
      {/* @ds state: live · newest · valid — renders only for a reviewable artifact. */}
      {/* @ds slot: header — title + check mark. */}
      <div className="plan-ready-header">
        <div>
          <p className="surface-kicker">Plan ready</p>
          {/* @ds slot: title */}
          <Heading id="plan-ready-title" level={2} className="plan-ready-title">
            {title}
          </Heading>
        </div>
        {/* @ds slot: mark — the ✓ confirmation badge. */}
        <span className="plan-ready-mark" aria-hidden="true">
          ✓
        </span>
      </div>
      {/* @ds slot: summary */}
      <p className="plan-ready-summary" dir="auto">
        {artifact.summary}
      </p>
      {/* @ds slot: meta — revision / steps / published grid. */}
      <dl className="plan-ready-meta">
        <div>
          <dt>Revision</dt>
          <dd dir="ltr">{artifact.planRevision}</dd>
        </div>
        <div>
          <dt>Steps</dt>
          <dd dir="ltr">{artifact.stepCount}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>
            <time dateTime={artifact.occurredAt}>{formatArtifactTime(artifact.occurredAt)}</time>
          </dd>
        </div>
      </dl>
      {/* @ds state: review CTA — canReview → 'Review plan' (waiting-for-live-confirmation below).
          @ds guardrail: do-not-edit — react-aria Button wiring (ref, isDisabled, onPress). */}
      <Button
        ref={reviewButtonRef}
        className="plan-ready-review"
        type="button"
        isDisabled={!canReview}
        onPress={onReview}
      >
        {canReview ? 'Review plan' : 'Waiting for live confirmation'}
      </Button>
      {/* @ds state: waiting-for-live-confirmation — the disabled CTA until the host binds the plan. */}
    </article>
  );
}

function formatArtifactTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
