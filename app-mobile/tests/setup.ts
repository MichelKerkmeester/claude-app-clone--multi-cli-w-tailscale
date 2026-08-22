// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Setup
// ───────────────────────────────────────────────────────────────────

import '@testing-library/jest-dom/vitest';

class TestResizeObserver implements ResizeObserver {
  disconnect() {}

  observe() {}

  unobserve() {}
}

globalThis.ResizeObserver = TestResizeObserver;

// jsdom does not implement scrollIntoView. bits-ui's Combobox/Select highlights the
// first candidate on input and scrolls it into view, which throws under jsdom and
// breaks the input handler. A no-op keeps keyboard/filter interactions working; nothing
// asserts on scroll behavior.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } satisfies Storage,
});
