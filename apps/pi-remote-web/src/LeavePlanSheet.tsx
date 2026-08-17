// ───────────────────────────────────────────────────────────────────
// MODULE: Leave Plan Mode Confirmation Sheet
// ───────────────────────────────────────────────────────────────────
// Every Plan → Build request opens this sheet first because leaving Plan
// EXPANDS host authority. Nothing is sent to the host until the operator
// presses "Switch to Build"; "Stay in plan" and every dismissal path
// leave the confirmed Plan state untouched. Focus enters on the safe
// action and returns to the mode button when the sheet closes.

import { useEffect, useRef } from 'react';
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import type { RefObject } from 'react';

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
    // Initial focus lands on the safe action, never on Switch to Build.
    const timer = window.setTimeout(() => stayRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

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
      <Modal className="leave-plan-sheet">
        <Dialog aria-label="Leave plan mode" className="leave-plan-dialog">
          <Heading slot="title" className="leave-plan-title">
            Leave plan mode?
          </Heading>
          <p className="leave-plan-body">
            Pi may request write-capable tools again. The current plan will not run.
          </p>
          <div className="leave-plan-actions">
            <Button ref={stayRef} type="button" className="leave-plan-stay" onPress={close}>
              Stay in plan
            </Button>
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
