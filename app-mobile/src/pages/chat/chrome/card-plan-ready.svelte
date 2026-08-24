<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: PLAN READY CARD
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: plan-ready-card — live validated plan summary + review entry.
  // @ds guardrail: do-not-edit — isReviewablePlanArtifact gates rendering on live + newest + valid, and canReview disables the review CTA until the host binds the plan. Not designer-editable.
  const PLAN_TITLE_DISPLAY_CAP = 160;

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface PlanReadyCardProps {
    readonly artifact: PlanArtifactDto | null | undefined;
    /** A live host snapshot, never a service-worker or transcript cache value. */
    readonly isLive: boolean;
    /** Older revisions remain history-only even if a caller still holds them. */
    readonly isNewest?: boolean;
    /** False until the live session has an opaque binding in memory. */
    readonly canReview?: boolean;
    readonly onReview: () => void;
    reviewButtonRef?: HTMLButtonElement | null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: do-not-edit — The reviewability gate (live · newest · valid) — Not designer-editable.
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

  function formatArtifactTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    );
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 5. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Button from '$shared/primitives/button/button.svelte';

  import './card-plan-ready.css';

  // ───────────────────────────────────────────────────────────────────
  // 6. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    artifact,
    isLive,
    isNewest = true,
    canReview = true,
    onReview,
    reviewButtonRef = $bindable(null),
  }: PlanReadyCardProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const reviewable = $derived(
    isReviewablePlanArtifact(artifact, isLive, isNewest) ? artifact : null,
  );
  const title = $derived(reviewable ? reviewable.title.slice(0, PLAN_TITLE_DISPLAY_CAP) : '');
</script>

{#if reviewable}
  <article class="plan-ready-card" aria-labelledby="plan-ready-title" data-plan-ready="true">
    <!-- @ds state: live · newest · valid — renders only for a reviewable artifact. -->
    <!-- @ds slot: header — title + check mark. -->
    <div class="plan-ready-header">
      <div>
        <p class="surface-kicker">Plan ready</p>
        <!-- @ds slot: title -->
        <h2 id="plan-ready-title" class="plan-ready-title">
          {title}
        </h2>
      </div>
      <!-- @ds slot: mark — the ✓ confirmation badge. -->
      <span class="plan-ready-mark" aria-hidden="true">
        ✓
      </span>
    </div>
    <!-- @ds slot: summary -->
    <p class="plan-ready-summary" dir="auto">
      {reviewable.summary}
    </p>
    <!-- @ds slot: meta — revision / steps / published grid. -->
    <dl class="plan-ready-meta">
      <div>
        <dt>Revision</dt>
        <dd dir="ltr">{reviewable.planRevision}</dd>
      </div>
      <div>
        <dt>Steps</dt>
        <dd dir="ltr">{reviewable.stepCount}</dd>
      </div>
      <div>
        <dt>Published</dt>
        <dd>
          <time datetime={reviewable.occurredAt}>{formatArtifactTime(reviewable.occurredAt)}</time>
        </dd>
      </div>
    </dl>
    <!-- @ds state: review CTA — canReview → 'Review plan' (waiting-for-live-confirmation below).
        @ds guardrail: do-not-edit — React-aria Button wiring (ref, isDisabled, onPress). -->
    <Button
      class="plan-ready-review"
      type="button"
      disabled={!canReview}
      onclick={onReview}
      {@attach (node) => {
        reviewButtonRef = node as HTMLButtonElement;
        return () => {
          if (reviewButtonRef === node) reviewButtonRef = null;
        };
      }}
    >
      {canReview ? 'Review plan' : 'Waiting for live confirmation'}
    </Button>
    <!-- @ds state: waiting-for-live-confirmation — the disabled CTA until the host binds the plan. -->
  </article>
{/if}

<!-- @ds surface: plan-ready-card — live validated plan summary + review entry. Decomposed into this co-located CSS file;
     plan-ready-card / plan-ready-mark and this card's owned members of shared ready/review pairs move
     with it. Grouped plan-review-* siblings stay global (plan-review-sheet). Child-primitive classes
     and react-aria/runtime data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
