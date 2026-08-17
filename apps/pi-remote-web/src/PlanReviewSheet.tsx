import { useEffect, useRef } from 'react';
import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
  TouchEvent as ReactTouchEvent,
} from 'react';

import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

export interface PlanReviewSheetProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly artifact: PlanArtifactDto | null | undefined;
  readonly isExecuting?: boolean;
  readonly onKeepPlanning: () => void;
  readonly onRevisePlan: () => void;
  readonly onLeaveWithoutRunning: () => void;
  readonly onExecuteReviewedPlan: () => void;
  readonly triggerRef?: RefObject<HTMLElement | null>;
}

export function PlanReviewSheet({
  isOpen,
  onOpenChange,
  artifact,
  isExecuting = false,
  onKeepPlanning,
  onRevisePlan,
  onLeaveWithoutRunning,
  onExecuteReviewedPlan,
  triggerRef,
}: PlanReviewSheetProps) {
  const safeActionRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);

  const restoreFocus = () => {
    window.setTimeout(() => triggerRef?.current?.focus({ preventScroll: true }), 0);
  };

  const dismissSafely = () => {
    onOpenChange(false);
    restoreFocus();
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => safeActionRef.current?.focus({ preventScroll: true }), 0);
    const previousState = window.history.state;
    window.history.pushState(
      { ...(previousState ?? {}), planReview: true },
      '',
      window.location.href,
    );

    const onPopState = () => dismissSafely();
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !sheetRef.current?.contains(target)) dismissSafely();
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
  }, [isOpen]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (start === null) return;
    if (event.clientY - start.y > 48 && Math.abs(event.clientX - start.x) < 96) dismissSafely();
  };

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (touch !== undefined) swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    const touch = event.changedTouches[0];
    if (start === null || touch === undefined) return;
    if (touch.clientY - start.y > 48 && Math.abs(touch.clientX - start.x) < 96) dismissSafely();
  };

  if (artifact === null || artifact === undefined || artifact.validity !== 'valid') return null;

  return (
    <ModalOverlay
      isOpen={isOpen}
      isDismissable
      onOpenChange={(open) => {
        if (!open) dismissSafely();
        else onOpenChange(true);
      }}
      className="plan-review-overlay"
    >
      <Modal className="plan-review-modal">
        <Dialog
          ref={sheetRef}
          aria-label="Review plan"
          className="plan-review-dialog"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="plan-review-grabber" aria-hidden="true" />
          <div className="plan-review-header">
            <div>
              <p className="surface-kicker">Plan review</p>
              <Heading slot="title" className="plan-review-title">
                {artifact.title}
              </Heading>
            </div>
            <span className="plan-review-revision" dir="ltr">
              Revision {artifact.planRevision}
            </span>
          </div>
          <div className="plan-review-content">
            <p className="plan-review-summary" dir="auto">
              {artifact.summary}
            </p>
            <dl className="plan-review-details">
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
                  <time dateTime={artifact.occurredAt}>
                    {formatReviewTime(artifact.occurredAt)}
                  </time>
                </dd>
              </div>
            </dl>
          </div>
          <div className="plan-review-actions">
            <Button
              ref={safeActionRef}
              type="button"
              className="plan-review-safe"
              onPress={onKeepPlanning}
            >
              Keep planning
            </Button>
            <Button type="button" className="plan-review-revise" onPress={onRevisePlan}>
              Revise plan
            </Button>
            <Button type="button" className="plan-review-leave" onPress={onLeaveWithoutRunning}>
              Leave without running
            </Button>
            <Button
              type="button"
              className="plan-review-execute"
              isDisabled={isExecuting}
              onPress={onExecuteReviewedPlan}
            >
              {isExecuting ? 'Execute pending' : 'Execute reviewed plan'}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function formatReviewTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
