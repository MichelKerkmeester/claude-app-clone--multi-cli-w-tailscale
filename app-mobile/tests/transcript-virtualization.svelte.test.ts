// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Virtualization Tests
// ───────────────────────────────────────────────────────────────────
// Every other suite that renders the transcript replaces the virtualizer with
// a stub returning every row, so no test has ever observed virtualization
// itself. This suite runs the real virtualizer and stubs the layout jsdom
// genuinely cannot provide: the virtualizer sizes its viewport from
// offsetHeight, which jsdom always reports as zero, so an unstubbed run
// renders an empty window and proves nothing.

import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

const VIEWPORT_HEIGHT = 600;
const ROW_HEIGHT = 180;
const BLOCK_COUNT = 200;
const MAX_EXPECTED_WINDOW = 40;
const LAYOUT_PROPERTIES = ['offsetHeight', 'offsetWidth'] as const;

function textBlocks(count: number): readonly DisplayTranscriptBlock[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `block_virtualization_${String(index).padStart(3, '0')}`,
    revision: 1,
    seq: index + 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'text' as const,
    role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
    text: `Line ${index}`,
  })) as readonly DisplayTranscriptBlock[];
}

function isScrollViewport(element: HTMLElement): boolean {
  return element.classList?.contains('transcript-scroll') === true;
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return isScrollViewport(this) ? VIEWPORT_HEIGHT : ROW_HEIGHT;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return 390;
    },
  });
});

afterEach(() => {
  for (const property of LAYOUT_PROPERTIES) {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[property];
  }
  cleanup();
});

describe('transcript virtualization', () => {
  it('renders a window rather than every block', async () => {
    render(TranscriptList, {
      props: {
        sessionId: 'session_virtualization_001',
        blocks: textBlocks(BLOCK_COUNT),
        running: false,
      },
    });

    await waitFor(() => {
      expect(document.querySelectorAll('.virtual-row').length).toBeGreaterThan(0);
    });

    // With a viewport this small the list must not materialise every row, or
    // virtualization is doing nothing and a regression in it stays invisible.
    // Four rows fit the viewport and the overscan adds six either side, so the
    // window is around ten; the bound is loose enough to survive an overscan
    // change and tight enough that rendering the whole list fails here.
    expect(document.querySelectorAll('.virtual-row').length).toBeLessThanOrEqual(
      MAX_EXPECTED_WINDOW,
    );
  });

  it('sizes the scrolled area for the whole list, not for the window', async () => {
    render(TranscriptList, {
      props: {
        sessionId: 'session_virtualization_002',
        blocks: textBlocks(BLOCK_COUNT),
        running: false,
      },
    });

    await waitFor(() => {
      expect(document.querySelector('.transcript-virtual')).not.toBeNull();
    });

    // A spacer covering only the rendered window would make the scrollbar lie
    // about how much transcript exists behind it.
    const spacer = document.querySelector('.transcript-virtual') as HTMLElement;
    expect(Number.parseFloat(spacer.style.height)).toBeGreaterThan(VIEWPORT_HEIGHT);
  });
});
