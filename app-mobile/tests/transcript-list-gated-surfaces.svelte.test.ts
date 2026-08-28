// ───────────────────────────────────────────────────────────────────
// MODULE: TRANSCRIPT LIST GATED SURFACE TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (v: unknown) => void) => {
      run(value);
      return () => undefined;
    },
  });
  return {
    createVirtualizer: (opts: { count?: number }) => {
      let count = opts?.count ?? 0;
      const api = {
        getTotalSize: () => count * 180,
        getVirtualItems: () =>
          Array.from({ length: count }, (_unused, index) => ({
            index,
            start: index * 180,
            key: index,
          })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => {
          if (typeof next?.count === 'number') count = next.count;
        },
        scrollToIndex: () => undefined,
      };
      return store(api);
    },
  };
});

import TranscriptList, {
  type TranscriptActivityEntry,
  type TranscriptEndReason,
} from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const BLOCK: DisplayTranscriptBlock = {
  id: 'block_gated_surface_001',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'text',
  role: 'assistant',
  text: 'The task is finished.',
};

const ACTIVITY: readonly TranscriptActivityEntry[] = [
  {
    id: 'activity_001',
    label: 'Inspecting the relay boundary',
    detail: 'The subagent is reading the available host capability.',
  },
];

function renderTranscript(
  props: {
    endReason?: TranscriptEndReason;
    subagentActivity?: readonly TranscriptActivityEntry[];
  } = {},
) {
  return render(TranscriptList, {
    props: {
      sessionId: 'session_gated_surface_001',
      blocks: [BLOCK],
      running: false,
      ...props,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('transcript list host-gated treatments', () => {
  it('renders the done treatment only for the explicit done end-reason flag', () => {
    const { container } = renderTranscript({ endReason: 'done' });

    const treatment = container.querySelector('[data-transcript-done="true"]');
    expect(treatment).not.toBeNull();
    expect(treatment).toHaveTextContent('Done');
  });

  it('does not infer done treatment from text that says the work is finished', () => {
    const { container } = renderTranscript();

    expect(screen.getByText('The task is finished.')).toBeInTheDocument();
    expect(container.querySelector('[data-transcript-done="true"]')).toBeNull();
  });

  it('renders no done treatment when the host provides no end-reason flag', () => {
    const { container } = renderTranscript({ endReason: undefined });

    expect(container.querySelector('[data-transcript-done="true"]')).toBeNull();
  });

  it('omits the activity tail when no host activity stream is available', () => {
    const { container } = renderTranscript();

    expect(container.querySelector('[data-transcript-activity-tail="true"]')).toBeNull();
  });

  it('keeps the activity tail collapsed until the reader expands it', async () => {
    const { container } = renderTranscript({ subagentActivity: ACTIVITY });

    const tail = container.querySelector(
      '[data-transcript-activity-tail="true"]',
    ) as HTMLDetailsElement | null;
    expect(tail).not.toBeNull();
    expect(tail?.open).toBe(false);
    expect(
      screen.getByText('The subagent is reading the available host capability.'),
    ).not.toBeVisible();

    const summary = tail?.querySelector('summary');
    expect(summary).not.toBeNull();
    await fireEvent.click(summary as HTMLElement);

    expect(tail?.open).toBe(true);
    expect(screen.getByText('The subagent is reading the available host capability.')).toBeInTheDocument();
  });
});
