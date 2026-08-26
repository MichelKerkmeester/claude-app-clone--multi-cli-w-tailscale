// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Find Bar Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const virtualApi = vi.hoisted(() => {
  const state = {
    count: 0,
    windowStart: 0,
    windowSize: 4,
    scrollToIndex: vi.fn((index: number) => {
      state.windowStart = Math.max(0, index);
    }),
  };
  return state;
});

vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (v: unknown) => void) => {
      run(value);
      return () => {};
    },
  });
  return {
    createVirtualizer: (opts: { count?: number }) => {
      virtualApi.count = opts?.count ?? 0;
      const api = {
        getTotalSize: () => virtualApi.count * 180,
        getVirtualItems: () => {
          const start = virtualApi.windowStart;
          const end = Math.min(virtualApi.count, start + virtualApi.windowSize);
          return Array.from({ length: Math.max(0, end - start) }, (_unused, offset) => {
            const index = start + offset;
            return { index, start: index * 180, key: index };
          });
        },
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => {
          if (typeof next?.count === 'number') virtualApi.count = next.count;
        },
        scrollToIndex: (index: number) => {
          virtualApi.scrollToIndex(index);
        },
      };
      return store(api);
    },
  };
});

import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

function userLine(index: number, text: string): DisplayTranscriptBlock {
  return {
    id: `block_find_${String(index).padStart(3, '0')}`,
    revision: 1,
    seq: index + 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'text',
    role: 'user',
    text,
  };
}

const BLOCKS: readonly DisplayTranscriptBlock[] = [
  userLine(0, 'alpha first match lives here'),
  ...Array.from({ length: 14 }, (_unused, index) => userLine(index + 1, `Filler line ${index + 1}`)),
  userLine(15, 'alpha last match lives here'),
];

beforeEach(() => {
  virtualApi.count = 0;
  virtualApi.windowStart = 0;
  virtualApi.scrollToIndex.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openFindAndQuery(query: string) {
  const user = userEvent.setup();
  render(TranscriptList, {
    props: { sessionId: 'session_find_001', blocks: BLOCKS, running: false },
  });
  await user.click(screen.getByRole('button', { name: 'Find' }));
  const input = screen.getByRole('searchbox', { name: 'Find in transcript' });
  await user.type(input, query);
  return { user, input };
}

function findCountText(): string {
  return document.querySelector('.transcript-find--count')?.textContent?.trim() ?? '';
}

describe('transcript find bar', () => {
  it('matches, wraps next/prev, and scrolls the virtualizer to an off-screen hit', async () => {
    const { user } = await openFindAndQuery('alpha');

    await waitFor(() => {
      expect(findCountText()).toBe('1/2');
    });
    expect(virtualApi.scrollToIndex).toHaveBeenCalled();
    const firstIndex = virtualApi.scrollToIndex.mock.calls.at(-1)?.[0];
    expect(firstIndex).toBe(0);
    expect(document.querySelector('mark.artifact-find--match')).not.toBeNull();
    expect(screen.queryByText(/alpha last match/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Next match' }));
    await waitFor(() => {
      expect(findCountText()).toBe('2/2');
    });
    expect(virtualApi.scrollToIndex.mock.calls.at(-1)?.[0]).toBe(15);
    expect(screen.getByText(/alpha last match/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next match' }));
    await waitFor(() => {
      expect(findCountText()).toBe('1/2');
    });
    expect(virtualApi.scrollToIndex.mock.calls.at(-1)?.[0]).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Previous match' }));
    await waitFor(() => {
      expect(findCountText()).toBe('2/2');
    });
    expect(virtualApi.scrollToIndex.mock.calls.at(-1)?.[0]).toBe(15);
  });

  it('uses Enter and Shift+Enter to step, and Escape to close', async () => {
    const { user, input } = await openFindAndQuery('alpha');
    await waitFor(() => expect(findCountText()).toBe('1/2'));

    await user.type(input, '{Enter}');
    await waitFor(() => expect(findCountText()).toBe('2/2'));

    await user.type(input, '{Shift>}{Enter}{/Shift}');
    await waitFor(() => expect(findCountText()).toBe('1/2'));

    await user.type(input, '{Escape}');
    expect(screen.queryByRole('searchbox', { name: 'Find in transcript' })).not.toBeInTheDocument();
  });
});
