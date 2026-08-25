<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface PlanReviewSheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly artifact: PlanArtifactDto | null | undefined;
    readonly isExecuting?: boolean;
    readonly onKeepPlanning: () => void;
    readonly onRevisePlan: () => void;
    readonly onLeaveWithoutRunning: () => void;
    readonly onExecuteReviewedPlan: () => void;
    /** The control that opened the sheet; focus returns to it on dismiss. */
    triggerRef?: HTMLElement | null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function formatReviewTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    );
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Button from '$shared/primitives/button/button.svelte';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    artifact,
    isExecuting = false,
    onKeepPlanning,
    onRevisePlan,
    onLeaveWithoutRunning,
    onExecuteReviewedPlan,
    triggerRef = null,
  }: PlanReviewSheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let sheetOpen = $state(false);
  let safeActionEl = $state<HTMLButtonElement | null>(null);
  let sheetEl = $state<HTMLElement | null>(null);
  let swipeStart = $state<{ readonly x: number; readonly y: number } | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Bits Dialog writes locally; mirror host open after every change.
  const hostOpen = $derived(isOpen);

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    sheetOpen = hostOpen;
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const restoreFocus = () => {
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  const dismissSafely = () => {
    onOpenChange(false);
    restoreFocus();
  };

  function onSheetOpenChange(next: boolean): void {
    if (!next) dismissSafely();
    else onOpenChange(true);
    sheetOpen = hostOpen;
  }

  // @ds guardrail: do-not-edit — Bits Dialog default auto-focus is prevented so the safe action (Keep planning) receives focus, never Execute.
  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
    safeActionEl?.focus({ preventScroll: true });
  }

  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreFocus();
  }

  // @ds guardrail: do-not-edit — The open effect (safe-action focus, back-button state + popstate, focusin containment) and swipe refs below are not designer-editable.
  $effect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => safeActionEl?.focus({ preventScroll: true }), 0);
    const previousState = window.history.state;
    window.history.pushState(
      { ...(previousState ?? {}), planReview: true },
      '',
      window.location.href,
    );

    const onPopState = () => dismissSafely();
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !sheetEl?.contains(target)) dismissSafely();
    };
    window.addEventListener('popstate', onPopState);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('focusin', onFocusIn);
      if (window.history.state?.planReview === true) {
        window.history.replaceState(previousState, '', window.location.href);
      }
    };
  });

  // @ds state: swipe-dismiss — dragging the grabber/backdrop past the threshold closes the sheet.
  // @ds guardrail: do-not-edit — The pointer/touch gesture handlers below are not designer-editable.
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;
    swipeStart = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent): void {
    const start = swipeStart;
    swipeStart = null;
    if (start === null) return;
    if (event.clientY - start.y > 48 && Math.abs(event.clientX - start.x) < 96) dismissSafely();
  }

  function onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (touch !== undefined) swipeStart = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent): void {
    const start = swipeStart;
    swipeStart = null;
    const touch = event.changedTouches[0];
    if (start === null || touch === undefined) return;
    if (touch.clientY - start.y > 48 && Math.abs(touch.clientX - start.x) < 96) dismissSafely();
  }

  function onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) dismissSafely();
  }

  // ───────────────────────────────────────────────────────────────────
  // 10. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function attachSheet(node: Element): () => void {
    const el = node as HTMLElement;
    const overlay = el.closest('.plan-review--overlay') as HTMLElement | null;
    sheetEl = overlay ?? el;
    return () => {
      if (sheetEl === overlay || sheetEl === el) sheetEl = null;
    };
  }

  function attachSafeAction(node: Element): () => void {
    const el = node as HTMLButtonElement;
    safeActionEl = el;
    return () => {
      if (safeActionEl === el) safeActionEl = null;
    };
  }
</script>

<!-- @ds surface: plan-review-sheet — modal review of the plan; the only atomic execute path. -->
<!-- @ds guardrail: do-not-edit — ModalOverlay/Modal/Dialog React-aria wiring, safe-focus restore, back-button (popstate) containment, focusin dismissal, and the touch/pointer swipe-dismiss gesture are not designer-editable. -->
{#if artifact !== null && artifact !== undefined && artifact.validity === 'valid'}
  <Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
    <!-- @ds slot: overlay — fixed scrim + centring. -->
    <!-- Bits Overlay/Content are siblings, so the overlay class lives on Content and the
         modal/dialog nest inside — the original overlay → modal → dialog box tree. -->
    <SheetContent
      class="plan-review--overlay"
      aria-label="Review plan"
      trapFocus={true}
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
      onclick={onOverlayClick}
      onpointerdown={onPointerDown}
      onpointerup={onPointerUp}
      ontouchstart={onTouchStart}
      ontouchend={onTouchEnd}
    >
       <!-- @ds slot: modal — bottom-docked sheet + entry. @ds guardrail: do-not-edit — Modal/Dialog React-aria wiring + swipe handlers. -->
      <div class="plan-review--modal" {@attach attachSheet}>
        <div class="plan-review--dialog">
          <!-- @ds slot: grabber — swipe-dismiss handle. -->
          <div class="plan-review--handle" aria-hidden="true"></div>
          <!-- @ds slot: header — title + revision. -->
          <div class="plan-review--header">
            <div>
              <p class="surface--eyebrow">Plan review</p>
              <SheetTitle class="plan-review--title">
                {artifact.title}
              </SheetTitle>
            </div>
            <!-- @ds slot: revision — mono pill. -->
            <span class="plan-review--revision" dir="ltr">
              Revision {artifact.planRevision}
            </span>
          </div>
          <!-- @ds slot: content — summary + details. -->
          <div class="plan-review--content">
            <p class="plan-review--summary" dir="auto">
              {artifact.summary}
            </p>
            <dl class="plan-review--details">
              <div>
                <dt>Steps</dt>
                <dd dir="ltr">{artifact.stepCount}</dd>
              </div>
              <div>
                <dt>Approaches</dt>
                <dd dir="ltr">{artifact.approachCount}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>
                  <time datetime={artifact.occurredAt}>
                    {formatReviewTime(artifact.occurredAt)}
                  </time>
                </dd>
              </div>
            </dl>
          </div>
          <!-- @ds slot: actions — keep · revise · leave · execute rail. -->
          <div class="plan-review--actions">
             <!-- @ds state: keep-planning — the non-mutating safety action. @ds guardrail: do-not-edit — React-aria Button wiring (ref, onPress). -->
            <Button
              type="button"
              class="plan-review--safe"
              onclick={onKeepPlanning}
              {@attach attachSafeAction}
            >
              Keep planning
            </Button>
            <!-- @ds state: revise — leaves the modal for the composer. -->
            <Button type="button" class="plan-review--revise" onclick={onRevisePlan}>
              Revise plan
            </Button>
            <!-- @ds state: leave-without-running — no-op on the plan. -->
            <Button type="button" class="plan-review--leave" onclick={onLeaveWithoutRunning}>
              Leave without running
            </Button>
            <!-- @ds state: execute CTA — the atomic execute path.
                 @ds state: executing — disabled while the execution lease is in flight.
                  @ds guardrail: do-not-edit — React-aria Button wiring (isDisabled, onPress). -->
            <Button
              type="button"
              class="plan-review--execute"
              disabled={isExecuting}
              onclick={onExecuteReviewedPlan}
            >
              {isExecuting ? 'Execute pending' : 'Execute reviewed plan'}
            </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
{/if}

<!-- @ds surface: plan-review-sheet — modal review of the plan; the only atomic execute path. Decomposed into this scoped block;
     plan-review-sheet owned rules and this sheet's owned members of shared ready/review pairs move with it.
     Grouped plan-ready-* siblings stay global (plan-ready--card). The system-wide
     prefers-reduced-motion group that includes .plan-review--modal stays global (shared with
     2+ surfaces). Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* @ds surface: plan-review-sheet — modal review of the plan; the only atomic execute path. */
  /* @ds surface: overlay — plan-review-sheet is an INSTANCE of the shared overlay
     primitive (backdrop → raised panel → grabber → header/body/footer).
     Physical unification of the per-surface overlay chrome is a documented follow-up. */
  /* @ds guardrail: do-not-edit — The review sheet is the only atomic execute path; dismissal and execute-authority semantics live in the component logic. Edit look and motion only. */
  /* @ds slot: overlay — fixed scrim + centring.
     @ds edit: layout — z-index 100 keeps it above every mode surface. */
  :global(.plan-review--overlay) {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    align-items: stretch;
    justify-content: center;
    background: color-mix(in srgb, var(--ink) 58%, transparent);
  }

  /* @ds slot: modal — bottom-docked sheet + entry motion. */
  /* @ds slot: panel — the Modal raised surface. */
  /* @ds state: opening · open — entry fade/rise, then rest. */
  .plan-review--modal {
    inline-size: min(100%, 44rem);
    max-block-size: 100dvh;
    margin-inline: auto;
    overflow: auto;
    background: var(--surface-raised);
    color: var(--ink);
    animation: plan-review-in 180ms ease-out;
  }

  /* @ds slot: dialog — scroll column + safe-area gutters. */
  .plan-review--dialog {
    display: grid;
    min-block-size: 100%;
    align-content: start;
    gap: var(--space-6);
    padding: max(var(--space-6), env(safe-area-inset-top))
      max(var(--space-6), env(safe-area-inset-right)) max(var(--space-6), env(safe-area-inset-bottom))
      max(var(--space-6), env(safe-area-inset-left));
    outline: none;
  }

  /* @ds slot: grabber — swipe-dismiss handle. */
  .plan-review--handle {
    inline-size: 2.25rem;
    block-size: 0.25rem;
    justify-self: center;
    border-radius: 999px;
    background: var(--ink-muted);
    opacity: 0.7;
  }

  /* @ds slot: header — title + check mark; shared with plan-review-sheet. */
  .plan-review--header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  /* @ds slot: kicker — shared section eyebrow pair; shared with plan-review-sheet. */
  .plan-review--header .surface--eyebrow {
    margin-bottom: var(--space-2);
  }

  /* @ds slot: title — display serif cap; shared with plan-review-sheet. */
  :global(.plan-review--title) {
    max-inline-size: 30ch;
    margin: 0;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 4vw, 1.7rem);
    font-weight: 400;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  /* @ds slot: revision — mono pill. */
  .plan-review--revision {
    flex: 0 0 auto;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 650;
  }

  /* @ds slot: content — summary + details. */
  .plan-review--content {
    display: grid;
    gap: var(--space-6);
    min-block-size: 0;
    padding-block-end: var(--space-6);
    border-block-end: 1px solid var(--line);
  }

  /* @ds slot: summary — plain prose; shared with plan-review-sheet. */
  .plan-review--summary {
    margin: 0;
    color: var(--ink-secondary);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  /* @ds slot: meta — revision / steps / published grid; shared with plan-review-sheet. */
  .plan-review--details {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin: 0;
  }

  /* @ds slot: meta-cell — one fact; shared with plan-review-sheet. */
  .plan-review--details > div {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  /* @ds slot: meta-label — dt; shared with plan-review-sheet. */
  .plan-review--details dt {
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* @ds slot: meta-value — dd; shared with plan-review-sheet. */
  .plan-review--details dd {
    margin: 0;
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 650;
    overflow-wrap: anywhere;
  }

  /* @ds slot: actions — keep · revise · leave · execute rail. */
  .plan-review--actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  /* @ds state: review CTA — shared pill chrome for the ready card and review sheet. */
  :global(.plan-review--safe),
  :global(.plan-review--revise),
  :global(.plan-review--leave),
  :global(.plan-review--execute) {
    min-block-size: 44px;
    padding-inline: var(--space-4);
    border-radius: 999px;
    font-size: 0.86rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* @ds state: non-executing actions — keep · revise · leave. */
  :global(.plan-review--safe),
  :global(.plan-review--revise),
  :global(.plan-review--leave) {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink);
  }

  /* @ds state: execute CTA — the atomic execute path. */
  :global(.plan-review--execute) {
    border: 0;
    background: var(--action-bg);
    color: var(--action-fg);
  }

  /* @ds state: executing — execute CTA disabled while the execution lease is in flight. */
  :global(.plan-review--execute[data-disabled]) {
    cursor: wait;
    opacity: 0.55;
  }

  /* @ds state: hover — non-executing actions. */
  :global(.plan-review--safe[data-hovered]),
  :global(.plan-review--revise[data-hovered]),
  :global(.plan-review--leave[data-hovered]) {
    background: var(--surface-muted);
  }

  /* @ds state: hover — execute CTA. */
  :global(.plan-review--execute[data-hovered]) {
    opacity: 0.82;
  }

  /* @ds end surface: plan-review-sheet */

  /* @ds edit: motion — review-sheet entry. */
  @keyframes plan-review-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* @ds edit: layout — narrow reflow of the ready card and review sheet. */
  @media (max-width: 24rem) {
    .plan-review--details,
    .plan-review--actions {
      grid-template-columns: 1fr;
    }
  }

  /* @ds edit: layout — viewport-height cap for the review sheet. */
  .plan-review--modal {
    max-block-size: 100svh;
    max-block-size: 100dvh;
  }

  /* @ds edit: layout — safe-area gutters for the review sheet. */
  .plan-review--dialog {
    padding-block-start: max(var(--space-6), env(safe-area-inset-top, 0px));
    padding-block-end: max(var(--space-6), env(safe-area-inset-bottom, 0px));
    padding-inline-start: max(var(--space-6), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--space-6), env(safe-area-inset-right, 0px));
  }

  /* @ds edit: layout — wrap handling for the card/sheet headers. */
  .plan-review--header {
    min-inline-size: 0;
    flex-wrap: wrap;
  }

  .plan-review--header > div {
    min-inline-size: 0;
  }

  /* @ds edit: layout — bidi + wrap for the card/sheet text. */
  :global(.plan-review--title),
  .plan-review--summary {
    overflow-wrap: anywhere;
    unicode-bidi: plaintext;
  }

  /* @ds edit: layout — bidi isolation for the mono revision and ltr meta values. */
  .plan-review--revision,
  .plan-review--details dd[dir='ltr'] {
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* @ds edit: layout — narrow reflow of the composer bar + ready/review card + sheets. */
  @media (max-width: 27rem) {
    .plan-review--details,
    .plan-review--actions {
      grid-template-columns: 1fr;
    }

    :global(.plan-review--safe),
    :global(.plan-review--revise),
    :global(.plan-review--leave),
    :global(.plan-review--execute) {
      inline-size: 100%;
    }
  }
</style>
