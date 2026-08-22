<script module lang="ts">
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
    reviewButtonRef?: HTMLButtonElement | null;
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

  function formatArtifactTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    );
  }
</script>

<script lang="ts">
  import Button from '../../../shared/primitives/Button.svelte';

  let {
    artifact,
    isLive,
    isNewest = true,
    canReview = true,
    onReview,
    reviewButtonRef = $bindable(null),
  }: PlanReadyCardProps = $props();

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
        @ds guardrail: do-not-edit — react-aria Button wiring (ref, isDisabled, onPress). -->
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

<!-- @ds surface: plan-ready-card — live validated plan summary + review entry. Decomposed into this scoped block;
     plan-ready-card / plan-ready-mark and this card's owned members of shared ready/review pairs move
     with it. Grouped plan-review-* siblings stay global (plan-review-sheet). Child-primitive classes
     and react-aria/runtime data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* @ds surface: plan-ready-card — live validated plan summary + review entry. */
  /* @ds state: reviewable — renders only when the artifact is live, newest and valid. */
  .plan-ready-card {
    display: grid;
    gap: var(--space-4);
    margin-block: var(--space-6);
    padding: var(--space-6);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  /* @ds slot: header — title + check mark; shared with plan-review-sheet. */
  .plan-ready-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  /* @ds slot: kicker — shared section eyebrow pair; shared with plan-review-sheet. */
  .plan-ready-header .surface-kicker {
    margin-bottom: var(--space-2);
  }

  /* @ds slot: title — display serif cap; shared with plan-review-sheet. */
  .plan-ready-title {
    max-inline-size: 30ch;
    margin: 0;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 4vw, 1.7rem);
    font-weight: 400;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  /* @ds slot: mark — the ✓ confirmation badge; never clay-only. */
  .plan-ready-mark {
    display: grid;
    min-inline-size: 2.25rem;
    min-block-size: 2.25rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 700;
  }

  /* @ds slot: summary — plain prose; shared with plan-review-sheet. */
  .plan-ready-summary {
    margin: 0;
    color: var(--ink-secondary);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  /* @ds slot: meta — revision / steps / published grid; shared with plan-review-sheet. */
  .plan-ready-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin: 0;
  }

  /* @ds slot: meta-cell — one fact; shared with plan-review-sheet. */
  .plan-ready-meta > div {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  /* @ds slot: meta-label — dt; shared with plan-review-sheet. */
  .plan-ready-meta dt {
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* @ds slot: meta-value — dd; shared with plan-review-sheet. */
  .plan-ready-meta dd {
    margin: 0;
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 650;
    overflow-wrap: anywhere;
  }

  /* @ds state: review CTA — shared pill chrome for the ready card and review sheet. */
  :global(.plan-ready-review) {
    min-block-size: 44px;
    padding-inline: var(--space-4);
    border-radius: 999px;
    font-size: 0.86rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* @ds state: review CTA active — card entry into the review sheet. */
  :global(.plan-ready-review) {
    justify-self: start;
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink);
  }

  /* @ds state: waiting-for-live-confirmation — review CTA disabled until the
     host binds the plan. */
  :global(.plan-ready-review[data-disabled]) {
    cursor: wait;
    opacity: 0.55;
  }

  /* @ds state: hover — non-executing actions. */
  :global(.plan-ready-review[data-hovered]) {
    background: var(--surface-muted);
  }

  /* @ds end surface: plan-ready-card */

  /* @ds edit: layout — wrap handling for the card/sheet headers. */
  .plan-ready-header {
    min-inline-size: 0;
    flex-wrap: wrap;
  }

  .plan-ready-header > div {
    min-inline-size: 0;
  }

  /* @ds edit: layout — bidi + wrap for the card/sheet text. */
  .plan-ready-title,
  .plan-ready-summary {
    overflow-wrap: anywhere;
    unicode-bidi: plaintext;
  }

  /* @ds edit: layout — bidi isolation for the mono revision and ltr meta values. */
  .plan-ready-meta dd[dir='ltr'] {
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* @ds edit: layout — narrow reflow of the ready card and review sheet. */
  @media (max-width: 24rem) {
    .plan-ready-card {
      padding: var(--space-4);
    }

    .plan-ready-meta {
      grid-template-columns: 1fr;
    }

    :global(.plan-ready-review) {
      inline-size: 100%;
    }
  }

  /* @ds edit: layout — narrow reflow of the composer bar + ready/review card + sheets. */
  @media (max-width: 27rem) {
    .plan-ready-meta {
      grid-template-columns: 1fr;
    }

    :global(.plan-ready-review) {
      inline-size: 100%;
    }
  }
</style>
