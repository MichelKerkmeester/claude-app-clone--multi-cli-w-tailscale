// ───────────────────────────────────────────────────────────────────
// MODULE: PINCH SCALE TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pinchScale } from '../src/shared/primitives/pinch-scale.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SCALE_PROPERTY = '--transcript-text-scale';
const cleanups: Array<() => void> = [];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function mountAction(): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const action = pinchScale(host);
  cleanups.push(() => {
    action.destroy?.();
    host.remove();
  });
  return host;
}

function scaleOf(host: HTMLElement): number | null {
  const value = host.style.getPropertyValue(SCALE_PROPERTY);
  return value.length === 0 ? null : Number(value);
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('pinchScale', () => {
  it('scales the transcript while two touch pointers move apart', () => {
    const host = mountAction();

    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 150,
      clientY: 0,
    });

    expect(scaleOf(host)).toBe(1.5);
  });

  it('stops at the 0.8x and 1.8x bounds', () => {
    const host = mountAction();

    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 500,
      clientY: 0,
    });
    expect(scaleOf(host)).toBe(1.8);

    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 10,
      clientY: 0,
    });
    expect(scaleOf(host)).toBe(0.8);
  });

  it('does not scale during a one-pointer drag', () => {
    const host = mountAction();

    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 40, clientY: 40 });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 240,
      clientY: 40,
    });

    expect(scaleOf(host)).toBeNull();
  });

  it('settles on a release outside the host and removes gesture listeners', () => {
    const host = mountAction();
    const removeListener = vi.spyOn(window, 'removeEventListener');

    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 150,
      clientY: 0,
    });
    expect(scaleOf(host)).toBe(1.5);

    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 2, pointerType: 'touch' });

    expect(scaleOf(host)).toBe(1.5);
    expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function), false);
    expect(removeListener).toHaveBeenCalledWith('pointerup', expect.any(Function), false);
    expect(removeListener).toHaveBeenCalledWith('pointercancel', expect.any(Function), false);
  });

  it('resets a cancelled gesture and allows a fresh pinch after cancellation', () => {
    const host = mountAction();

    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 150,
      clientY: 0,
    });
    fireEvent.pointerCancel(window, { pointerId: 2, pointerType: 'touch' });

    expect(scaleOf(host)).toBeNull();

    fireEvent.pointerDown(host, { pointerId: 3, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 4, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(window, {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 125,
      clientY: 0,
    });

    expect(scaleOf(host)).toBe(1.25);
  });

  it('restores the host and drops its listener when destroyed mid-gesture', () => {
    // Unmounting during a pinch must not leave the transcript stuck mid-scale
    // or leak the pointerdown listener that starts the next gesture.
    const host = document.createElement('div');
    document.body.append(host);
    const removeListener = vi.spyOn(host, 'removeEventListener');
    const action = pinchScale(host);
    fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 });
    fireEvent.pointerDown(host, { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 0 });
    fireEvent.pointerMove(host, { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 0 });
    expect(scaleOf(host)).not.toBeNull();

    action?.destroy?.();
    expect(scaleOf(host)).toBeNull();
    expect(removeListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });
});
