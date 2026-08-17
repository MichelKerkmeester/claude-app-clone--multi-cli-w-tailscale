import { Button, Heading } from 'react-aria-components';
import type { RefObject } from 'react';

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

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
      <div className="plan-ready-header">
        <div>
          <p className="surface-kicker">Plan ready</p>
          <Heading id="plan-ready-title" level={2} className="plan-ready-title">
            {title}
          </Heading>
        </div>
        <span className="plan-ready-mark" aria-hidden="true">
          ✓
        </span>
      </div>
      <p className="plan-ready-summary" dir="auto">
        {artifact.summary}
      </p>
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
      <Button
        ref={reviewButtonRef}
        className="plan-ready-review"
        type="button"
        isDisabled={!canReview}
        onPress={onReview}
      >
        {canReview ? 'Review plan' : 'Waiting for live confirmation'}
      </Button>
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
