<script module lang="ts">
  export interface LeavePlanSheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** The only host mutation path; never invoked by dismissal or Stay. */
    readonly onSwitchToBuild: () => void;
    /** Plan-ready uses the same authority-expanding confirmation with safer copy. */
    readonly variant?: 'mode' | 'plan-ready';
    readonly planReady?: boolean;
    readonly onLeaveWithoutRunning?: () => void;
    /** The mode button that led here; focus returns to it on close. */
    triggerRef?: HTMLButtonElement | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import Button from '$shared/primitives/button/button.svelte';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    onSwitchToBuild,
    variant = 'mode',
    planReady = false,
    onLeaveWithoutRunning,
    triggerRef = $bindable(null),
  }: LeavePlanSheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let sheetOpen = $state(false);
  let stayEl = $state<HTMLButtonElement | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const isPlanReady = $derived(variant === 'plan-ready' || planReady);

  // Bits Dialog writes locally; mirror host open after every change.
  const hostOpen = $derived(isOpen);

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    sheetOpen = hostOpen;
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const restoreTriggerFocus = () => {
    // Fallback focus when the menu row has unmounted.
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  const close = () => {
    onOpenChange(false);
    restoreTriggerFocus();
  };

  function onSheetOpenChange(next: boolean): void {
    if (!next) close();
    else onOpenChange(true);
    sheetOpen = hostOpen;
  }

  // @ds guardrail: do-not-edit — Bits Dialog default auto-focus is prevented so the safe action (Stay) receives focus, never Switch to Build.
  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
    stayEl?.focus({ preventScroll: true });
  }

  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreTriggerFocus();
  }

  function onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) close();
  }

  // @ds guardrail: do-not-edit — Safe-action focus effect; lands on Stay, never Switch to Build.
  $effect(() => {
    if (!isOpen) return;
    // Initial focus lands on the safe action, never on Switch to Build.
    const timer = window.setTimeout(() => stayEl?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(timer);
  });

  function attachStay(node: Element): () => void {
    const el = node as HTMLButtonElement;
    stayEl = el;
    return () => {
      if (stayEl === el) stayEl = null;
    };
  }
</script>

<!-- ───────────────────────────────────────────────────────────────────
     MODULE: Leave Plan Mode Confirmation Sheet
     ───────────────────────────────────────────────────────────────────
     Every Plan → Build request opens this sheet first because leaving Plan
     EXPANDS host authority. Nothing is sent to the host until the operator
     presses "Switch to Build"; "Stay in plan" and every dismissal path
     leave the confirmed Plan state untouched. Focus enters on the safe
     action and returns to the mode button when the sheet closes. -->

<!-- @ds surface: leave-plan-sheet — confirmation before Plan → Build expands host authority. -->
<!-- @ds guardrail: do-not-edit — onSwitchToBuild is the only host mutation path; Stay and every dismissal leave the confirmed Plan state untouched, and focus lands on Stay first. Not designer-editable. -->
<!-- @ds state: mode · plan-ready — variants of the same authority-expanding confirmation (copy only). -->
<!-- @ds guardrail: do-not-edit — ModalOverlay/Modal/Dialog React-aria wiring (open, dismiss, focus restore) — Not designer-editable. -->
<Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
  <!-- @ds slot: overlay — fixed scrim + bottom-sheet placement.
       Bits Overlay/Content are siblings, so the overlay class lives on Content and the
       modal/dialog nest inside — the original overlay → modal → dialog box tree. -->
  <SheetContent
    class="leave-plan-overlay"
    aria-label="Leave plan mode"
    trapFocus={true}
    onOpenAutoFocus={onOpenAutoFocus}
    onCloseAutoFocus={onCloseAutoFocus}
    onclick={onOverlayClick}
  >
    <!-- @ds slot: sheet — constraint + raised bottom sheet. -->
    <div class="leave-plan-sheet">
      <div class="leave-plan-dialog">
        <!-- @ds slot: title -->
        <SheetTitle class="leave-plan-title">
          Leave plan mode?
        </SheetTitle>
        <!-- @ds slot: body — explanatory copy. -->
        <p class="leave-plan-body">
          Pi may request write-capable tools again. The current plan will not run.
        </p>
        <!-- @ds slot: actions — stay · switch rail. -->
        <div class="leave-plan-actions">
           <!-- @ds state: stay — the safe, authority-preserving action. @ds guardrail: do-not-edit — React-aria Button wiring (ref, onPress). -->
          <Button
            type="button"
            class="leave-plan-stay"
            onclick={close}
            {@attach attachStay}
          >
            Stay in plan
          </Button>
           <!-- @ds state: switch — the only authority-expanding path; copy switches on the mode / plan-ready variant. @ds guardrail: do-not-edit — React-aria Button wiring + the mutation call. -->
          <Button
            type="button"
            class="leave-plan-switch"
            onclick={() => {
              onOpenChange(false);
              restoreTriggerFocus();
              (onLeaveWithoutRunning ?? onSwitchToBuild)();
            }}
          >
            {isPlanReady ? 'Leave without running' : 'Switch to Build'}
          </Button>
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>

<!-- @ds surface: leave-plan-sheet — confirmation before Plan → Build expands host authority. Decomposed into this scoped block;
     leave-plan owned rules move with it. Grouped prefers-reduced-motion / prefers-contrast /
     forced-colors siblings stay global (shared with plan-mode-button, session-card, and other
     chrome). Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* @ds surface: leave-plan-sheet — confirmation before Plan → Build expands host authority. */
  /* @ds surface: overlay — leave-plan-sheet is an INSTANCE of the shared overlay
     primitive (backdrop → raised panel → header/body/actions). Physical unification
     of the per-surface overlay chrome is a documented follow-up. */
  /* @ds slot: overlay — fixed scrim + bottom-sheet placement.
     @ds edit: layout — z-index 60 keeps it above the mode surfaces and below the review sheet. */
  :global(.leave-plan-overlay) {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 35%);
  }

  /* @ds slot: sheet — constraint + raised sheet + entry. */
  /* @ds slot: panel — the raised bottom-sheet surface. */
  /* @ds state: open — the resting raised sheet (settle transition). */
  /* @ds guardrail: do-not-edit — Leave-plan is an authority-gating overlay; its dismissal and safe-action semantics live in the component logic. Edit look and motion only; never the dismissal behavior. */
  .leave-plan-sheet {
    inline-size: 100%;
    max-inline-size: 34rem;
    padding: max(var(--space-4), env(safe-area-inset-bottom));
    border-start-start-radius: 1.25rem;
    border-start-end-radius: 1.25rem;
    border-end-end-radius: 0;
    border-end-start-radius: 0;
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
    transition: transform 180ms var(--ease-out, ease);
  }

  /* @ds slot: dialog — content column + focus seam. */
  .leave-plan-dialog {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-2);
    outline: none;
  }

  /* @ds slot: title */
  :global(.leave-plan-title) {
    margin: 0;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 650;
    line-height: 1.3;
  }

  /* @ds slot: body — explanatory copy. */
  .leave-plan-body {
    margin: 0;
    color: var(--ink-secondary);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  /* @ds slot: actions — the two-choice rail. */
  .leave-plan-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-block-start: var(--space-2);
  }

  /* @ds state: stay · switch — shared button chrome on the two-choice rail. */
  :global(.leave-plan-stay),
  :global(.leave-plan-switch) {
    min-block-size: 44px;
    padding-inline: var(--space-3);
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 620;
    cursor: pointer;
  }

  /* @ds state: stay — the safe, authority-preserving action. */
  :global(.leave-plan-stay) {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink);
  }

  /* @ds state: switch — the only authority-expanding path; copy varies by the
     mode / plan-ready variant. */
  :global(.leave-plan-switch) {
    border: 0;
    background: var(--action-bg);
    color: var(--action-fg);
  }

  /* @ds state: focus-visible */
  :global(.leave-plan-stay[data-focus-visible]),
  :global(.leave-plan-switch[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  /* @ds end surface: leave-plan-sheet */

  /* @ds edit: layout — safe-area gutters for the leave sheet. */
  .leave-plan-sheet {
    padding-block-start: max(var(--space-4), env(safe-area-inset-top, 0px));
    padding-block-end: max(var(--space-4), env(safe-area-inset-bottom, 0px));
    padding-inline-start: max(var(--space-4), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--space-4), env(safe-area-inset-right, 0px));
  }
</style>
