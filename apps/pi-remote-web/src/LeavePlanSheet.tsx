// ───────────────────────────────────────────────────────────────────
// MODULE: Leave Plan Mode Confirmation Sheet
// ───────────────────────────────────────────────────────────────────
// Every Plan → Build request opens this sheet first because leaving Plan
// EXPANDS host authority. Nothing is sent to the host until the operator
// presses "Switch to Build"; "Stay in plan" and every dismissal path
// leave the confirmed Plan state untouched. Focus enters on the safe
// action and returns to the mode button when the sheet closes.

// @ds surface: leave-plan-sheet — confirmation before Plan → Build expands host authority.
// @ds guardrail: do-not-edit — onSwitchToBuild is the only host mutation path; Stay and every
// dismissal leave the confirmed Plan state untouched, and focus lands on Stay first. Not
// designer-editable.

import { useEffect, useRef } from 'react';
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import type { RefObject } from 'react';

// @ds state: mode · plan-ready — variants of the same authority-expanding confirmation (copy only).
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
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}

export function LeavePlanSheet({
  isOpen,
  onOpenChange,
  onSwitchToBuild,
  variant = 'mode',
  planReady = false,
  onLeaveWithoutRunning,
  triggerRef,
}: LeavePlanSheetProps) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const isPlanReady = variant === 'plan-ready' || planReady;

  const restoreTriggerFocus = () => {
    // The modal restores focus on its own; this timer covers paths where the
    // previously focused menu row has unmounted, so the mode button is the
    // deterministic landing spot.
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };

  const close = () => {
    onOpenChange(false);
    restoreTriggerFocus();
  };

  useEffect(() => {
    if (!isOpen) return;
    // @ds guardrail: do-not-edit — safe-action focus effect; lands on Stay, never Switch to Build.
    // Initial focus lands on the safe action, never on Switch to Build.
    const timer = window.setTimeout(() => stayRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // @ds guardrail: do-not-edit — ModalOverlay/Modal/Dialog react-aria wiring (open, dismiss,
  // focus restore) — not designer-editable.
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) restoreTriggerFocus();
      }}
      className="leave-plan-overlay"
      isDismissable
    >
      {/* @ds slot: overlay — fixed scrim + bottom-sheet placement. */}
      <Modal className="leave-plan-sheet">
        {/* @ds slot: sheet — constraint + raised bottom sheet. */}
        <Dialog aria-label="Leave plan mode" className="leave-plan-dialog">
          {/* @ds slot: title */}
          <Heading slot="title" className="leave-plan-title">
            Leave plan mode?
          </Heading>
          {/* @ds slot: body — explanatory copy. */}
          <p className="leave-plan-body">
            Pi may request write-capable tools again. The current plan will not run.
          </p>
          {/* @ds slot: actions — stay · switch rail. */}
          <div className="leave-plan-actions">
            {/* @ds state: stay — the safe, authority-preserving action.
                @ds guardrail: do-not-edit — react-aria Button wiring (ref, onPress). */}
            <Button ref={stayRef} type="button" className="leave-plan-stay" onPress={close}>
              Stay in plan
            </Button>
            {/* @ds state: switch — the only authority-expanding path; copy switches on the
                mode / plan-ready variant.
                @ds guardrail: do-not-edit — react-aria Button wiring + the mutation call. */}
            <Button
              type="button"
              className="leave-plan-switch"
              onPress={() => {
                onOpenChange(false);
                restoreTriggerFocus();
                (onLeaveWithoutRunning ?? onSwitchToBuild)();
              }}
            >
              {isPlanReady ? 'Leave without running' : 'Switch to Build'}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
