// ───────────────────────────────────────────────────────────────────
// MODULE: PINCH SCALE
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { Action } from 'svelte/action';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.8;
const DEFAULT_SCALE = 1;
const SCALE_PROPERTY = '--transcript-text-scale';
const TOUCH_POINTER = 'touch';
const PASSIVE_POINTER_EVENTS: AddEventListenerOptions = { passive: true };

// ───────────────────────────────────────────────────────────────────
// 3. TYPES
// ───────────────────────────────────────────────────────────────────

interface PointerPosition {
  x: number;
  y: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

// Keep the distance calculation independent from the gesture lifecycle.
function pointerDistance(first: PointerPosition, second: PointerPosition): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

// Keep the reader scale within the range that remains useful on a small screen.
function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

// Use the existing inline value as the in-memory starting point for this action.
function initialScale(value: string): number {
  if (value.length === 0) return DEFAULT_SCALE;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampScale(parsed) : DEFAULT_SCALE;
}

// ───────────────────────────────────────────────────────────────────
// 5. ACTION
// ───────────────────────────────────────────────────────────────────

// Observe a second touch pointer without capturing the scroll gesture.
export const pinchScale: Action<HTMLElement> = (node) => {
  const view = node.ownerDocument.defaultView;
  if (view === null) return { destroy() {} };

  const pointers = new Map<number, PointerPosition>();
  const originalScale = node.style.getPropertyValue(SCALE_PROPERTY);
  const originalPriority = node.style.getPropertyPriority(SCALE_PROPERTY);
  let currentScale = initialScale(originalScale);
  let gestureStartScale = currentScale;
  let initialDistance = 0;
  let pinching = false;
  let blocked = false;
  let windowListenersAttached = false;

  const restoreScale = (): void => {
    if (originalScale.length === 0) {
      node.style.removeProperty(SCALE_PROPERTY);
    } else {
      node.style.setProperty(SCALE_PROPERTY, originalScale, originalPriority);
    }
  };

  const setScale = (value: number): void => {
    if (!Number.isFinite(value)) return;
    currentScale = clampScale(value);
    if (originalScale.length === 0 && currentScale === DEFAULT_SCALE) {
      node.style.removeProperty(SCALE_PROPERTY);
    } else {
      node.style.setProperty(SCALE_PROPERTY, String(currentScale));
    }
  };

  const removeWindowListeners = (): void => {
    if (!windowListenersAttached) return;
    view.removeEventListener('pointermove', onPointerMove, false);
    view.removeEventListener('pointerup', onPointerUp, false);
    view.removeEventListener('pointercancel', onPointerCancel, false);
    view.removeEventListener('blur', onWindowBlur);
    windowListenersAttached = false;
  };

  const resetGesture = (): void => {
    if (pinching) setScale(gestureStartScale);
    pointers.clear();
    initialDistance = 0;
    pinching = false;
    blocked = false;
    removeWindowListeners();
  };

  const onPointerMove = (event: PointerEvent): void => {
    const pointer = pointers.get(event.pointerId);
    if (pointer === undefined) return;

    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (blocked || pointers.size !== 2) return;

    const [first, second] = [...pointers.values()];
    if (first === undefined || second === undefined) return;
    const currentDistance = pointerDistance(first, second);
    if (!pinching) {
      if (currentDistance === 0) return;
      initialDistance = currentDistance;
      pinching = true;
      return;
    }
    if (initialDistance === 0) return;
    setScale(currentDistance / initialDistance);
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) return;
    if (pinching) {
      initialDistance = 0;
      pinching = false;
    }
    if (pointers.size < 2) initialDistance = 0;
    if (pointers.size === 0) {
      blocked = false;
      removeWindowListeners();
    }
  };

  const onPointerCancel = (): void => {
    resetGesture();
  };

  const onWindowBlur = (): void => {
    resetGesture();
  };

  const addWindowListeners = (): void => {
    if (windowListenersAttached) return;
    view.addEventListener('pointermove', onPointerMove, PASSIVE_POINTER_EVENTS);
    view.addEventListener('pointerup', onPointerUp, PASSIVE_POINTER_EVENTS);
    view.addEventListener('pointercancel', onPointerCancel, PASSIVE_POINTER_EVENTS);
    view.addEventListener('blur', onWindowBlur);
    windowListenersAttached = true;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== TOUCH_POINTER || blocked || pointers.has(event.pointerId)) return;

    addWindowListeners();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      if (first !== undefined && second !== undefined) {
        gestureStartScale = currentScale;
        initialDistance = pointerDistance(first, second);
        pinching = initialDistance > 0;
      }
    } else if (pointers.size > 2) {
      if (pinching) setScale(gestureStartScale);
      blocked = true;
      pinching = false;
      initialDistance = 0;
    }
  };

  node.addEventListener('pointerdown', onPointerDown);

  return {
    destroy() {
      resetGesture();
      restoreScale();
      node.removeEventListener('pointerdown', onPointerDown);
    },
  };
};
