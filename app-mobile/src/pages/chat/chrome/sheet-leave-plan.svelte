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

  import './sheet-leave-plan.css';

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

  // Host-confirmed open only; Bits Dialog writes false on dismiss, so a local
  // Copy is restored to the host value after every change (non-optimistic).
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
    // The modal restores focus on its own; this timer covers paths where the
    // Previously focused menu row has unmounted, so the mode button is the
    // Deterministic landing spot.
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

<!-- @ds surface: leave-plan-sheet — confirmation before Plan → Build expands host authority. Decomposed into this co-located CSS file;
     leave-plan owned rules move with it. Grouped prefers-reduced-motion / prefers-contrast /
     forced-colors siblings stay global (shared with plan-mode-button, session-card, and other
     chrome). Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
