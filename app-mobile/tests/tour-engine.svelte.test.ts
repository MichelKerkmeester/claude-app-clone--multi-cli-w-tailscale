// ───────────────────────────────────────────────────────────────────
// MODULE: TOUR ENGINE TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTourEngine,
  type TourDefinition,
  type TourStorage,
} from '$shared/state/tour-engine.svelte.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

class MemoryStorage implements TourStorage {
  private readonly values = new Map<string, string>();
  readCount = 0;

  getItem(key: string): string | null {
    this.readCount += 1;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const findBarTarget = '[data-tour-target="transcript-find-bar"]';
const dictationTarget = '[data-tour-target="dictation-overlay"]';

function tourWithSteps(steps: TourDefinition['steps']): TourDefinition {
  return { id: 'chat-discovery', steps };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = '';
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('target-gated tour engine', () => {
  it('advances past a step whose target is absent', () => {
    document.body.innerHTML = `<div data-tour-target="transcript-find-bar"></div>`;
    const storage = new MemoryStorage();
    const engine = createTourEngine({
      tours: [
        tourWithSteps([
          { id: 'dictation', target: dictationTarget },
          { id: 'find-bar', target: findBarTarget },
        ]),
      ],
      isOverlayOpen: () => false,
      storage,
    });

    expect(engine.start('chat-discovery')).toBe(true);
    expect(engine.currentStep?.id).toBe('find-bar');
    expect(engine.isVisible).toBe(true);
  });

  it('rehydrates the seen marker from device storage after a reload', () => {
    document.body.innerHTML = `<div data-tour-target="dictation-overlay"></div>`;
    const storage = new MemoryStorage();
    const tours = [tourWithSteps([{ id: 'dictation', target: dictationTarget }])];
    const firstLoad = createTourEngine({ tours, isOverlayOpen: () => false, storage });

    expect(firstLoad.start('chat-discovery')).toBe(true);
    expect(firstLoad.hasSeen('chat-discovery')).toBe(true);

    const reloaded = createTourEngine({ tours, isOverlayOpen: () => false, storage });

    expect(storage.readCount).toBe(2);
    expect(reloaded.hasSeen('chat-discovery')).toBe(true);
    expect(reloaded.start('chat-discovery')).toBe(false);
    expect(reloaded.isVisible).toBe(false);
  });

  it('does not render a coach mark while an overlay is open', () => {
    document.body.innerHTML = `<div data-tour-target="transcript-find-bar"></div>`;
    const storage = new MemoryStorage();
    let overlayOpen = true;
    const engine = createTourEngine({
      tours: [tourWithSteps([{ id: 'find-bar', target: findBarTarget }])],
      isOverlayOpen: () => overlayOpen,
      storage,
    });

    expect(engine.start('chat-discovery')).toBe(false);
    expect(engine.currentStep).toBeNull();

    overlayOpen = false;
    expect(engine.start('chat-discovery')).toBe(true);

    overlayOpen = true;
    expect(engine.isVisible).toBe(false);
    expect(engine.currentStep).toBeNull();
  });
});
