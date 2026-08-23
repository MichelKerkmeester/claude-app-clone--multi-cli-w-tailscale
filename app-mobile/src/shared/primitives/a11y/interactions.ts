// ───────────────────────────────────────────────────────────────────
// MODULE: INTERACTION ACTIONS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { Action } from 'svelte/action';

// ───────────────────────────────────────────────────────────────────
// 2. HOVER ACTION
// ───────────────────────────────────────────────────────────────────

// Keep hover state pointer-aware so touch taps never leave CSS :hover stuck.
export const hover: Action<HTMLElement> = (node) => {
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    node.setAttribute('data-hovered', 'true');
  };
  const clear = (): void => node.removeAttribute('data-hovered');
  node.addEventListener('pointerenter', onPointerEnter);
  node.addEventListener('pointerleave', clear);
  node.addEventListener('pointercancel', clear);
  return {
    destroy() {
      node.removeEventListener('pointerenter', onPointerEnter);
      node.removeEventListener('pointerleave', clear);
      node.removeEventListener('pointercancel', clear);
    },
  };
};

// ───────────────────────────────────────────────────────────────────
// 3. PRESS ACTION
// ───────────────────────────────────────────────────────────────────

// Track press state across pointer and keyboard activation for consistent feedback.
export const press: Action<HTMLElement> = (node) => {
  let pointerHeld = false;
  const setPressed = (value: boolean): void => {
    if (value) node.setAttribute('data-pressed', 'true');
    else node.removeAttribute('data-pressed');
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerHeld = true;
    setPressed(true);
    const onRelease = (): void => {
      pointerHeld = false;
      setPressed(false);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
    };
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
  };
  const onPointerLeave = (): void => {
    if (pointerHeld) setPressed(false);
  };
  const onPointerEnter = (): void => {
    if (pointerHeld) setPressed(true);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') setPressed(true);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') setPressed(false);
  };
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointerleave', onPointerLeave);
  node.addEventListener('pointerenter', onPointerEnter);
  node.addEventListener('keydown', onKeyDown);
  node.addEventListener('keyup', onKeyUp);
  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointerleave', onPointerLeave);
      node.removeEventListener('pointerenter', onPointerEnter);
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('keyup', onKeyUp);
    },
  };
};

// ───────────────────────────────────────────────────────────────────
// 4. FOCUS ACTIONS
// ───────────────────────────────────────────────────────────────────

// Preserve keyboard-only focus indication through the data-focus-visible state.
export const focusVisible: Action<HTMLElement> = (node) => {
  const onFocus = (): void => {
    if (node.matches(':focus-visible')) node.setAttribute('data-focus-visible', 'true');
    else node.removeAttribute('data-focus-visible');
  };
  const onBlur = (): void => node.removeAttribute('data-focus-visible');
  node.addEventListener('focus', onFocus);
  node.addEventListener('blur', onBlur);
  return {
    destroy() {
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', onBlur);
    },
  };
};

// Expose focus state regardless of input modality for consumer styling.
export const focused: Action<HTMLElement> = (node) => {
  const onFocus = (): void => node.setAttribute('data-focused', 'true');
  const onBlur = (): void => node.removeAttribute('data-focused');
  node.addEventListener('focus', onFocus);
  node.addEventListener('blur', onBlur);
  return {
    destroy() {
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', onBlur);
    },
  };
};
