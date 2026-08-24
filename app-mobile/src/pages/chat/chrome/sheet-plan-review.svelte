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

  import './sheet-plan-review.css';

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

  // Host-confirmed open only; Bits Dialog writes false on dismiss, so a local
  // Copy is restored to the host value after every change (non-optimistic).
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
    const overlay = el.closest('.plan-review-overlay') as HTMLElement | null;
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
      class="plan-review-overlay"
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
      <div class="plan-review-modal" {@attach attachSheet}>
        <div class="plan-review-dialog">
          <!-- @ds slot: grabber — swipe-dismiss handle. -->
          <div class="plan-review-grabber" aria-hidden="true"></div>
          <!-- @ds slot: header — title + revision. -->
          <div class="plan-review-header">
            <div>
              <p class="surface-kicker">Plan review</p>
              <SheetTitle class="plan-review-title">
                {artifact.title}
              </SheetTitle>
            </div>
            <!-- @ds slot: revision — mono pill. -->
            <span class="plan-review-revision" dir="ltr">
              Revision {artifact.planRevision}
            </span>
          </div>
          <!-- @ds slot: content — summary + details. -->
          <div class="plan-review-content">
            <p class="plan-review-summary" dir="auto">
              {artifact.summary}
            </p>
            <dl class="plan-review-details">
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
          <div class="plan-review-actions">
             <!-- @ds state: keep-planning — the non-mutating safety action. @ds guardrail: do-not-edit — React-aria Button wiring (ref, onPress). -->
            <Button
              type="button"
              class="plan-review-safe"
              onclick={onKeepPlanning}
              {@attach attachSafeAction}
            >
              Keep planning
            </Button>
            <!-- @ds state: revise — leaves the modal for the composer. -->
            <Button type="button" class="plan-review-revise" onclick={onRevisePlan}>
              Revise plan
            </Button>
            <!-- @ds state: leave-without-running — no-op on the plan. -->
            <Button type="button" class="plan-review-leave" onclick={onLeaveWithoutRunning}>
              Leave without running
            </Button>
            <!-- @ds state: execute CTA — the atomic execute path.
                 @ds state: executing — disabled while the execution lease is in flight.
                  @ds guardrail: do-not-edit — React-aria Button wiring (isDisabled, onPress). -->
            <Button
              type="button"
              class="plan-review-execute"
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

<!-- @ds surface: plan-review-sheet — modal review of the plan; the only atomic execute path. Decomposed into this co-located CSS file;
     plan-review-sheet owned rules and this sheet's owned members of shared ready/review pairs move with it.
     Grouped plan-ready-* siblings stay global (plan-ready-card). The system-wide
     prefers-reduced-motion group that includes .plan-review-modal stays global (shared with
     2+ surfaces). Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
