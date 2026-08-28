// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Find Focus Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const virtualApi = vi.hoisted(() => ({ count: 0 }));

vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (value: unknown) => void) => {
      run(value);
      return () => {};
    },
  });
  return {
    createVirtualizer: (options: { count?: number }) => {
      virtualApi.count = options.count ?? 0;
      const api = {
        getTotalSize: () => virtualApi.count * 180,
        getVirtualItems: () =>
          Array.from({ length: virtualApi.count }, (_unused, index) => ({
            index,
            start: index * 180,
            key: index,
          })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => {
          if (typeof next.count === 'number') virtualApi.count = next.count;
        },
        scrollToIndex: () => undefined,
      };
      return store(api);
    },
  };
});

import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const BLOCKS: readonly DisplayTranscriptBlock[] = [
  {
    id: 'find_focus_block',
    revision: 1,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'text',
    role: 'user',
    text: 'Searchable transcript content',
  },
];

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('transcript find focus', () => {
  it('focuses the search input after Find opens', async () => {
    const user = userEvent.setup();
    render(TranscriptList, {
      props: { sessionId: 'session_find_focus', blocks: BLOCKS, running: false },
    });

    await user.click(screen.getByRole('button', { name: 'Find' }));
    const input = await screen.findByRole('searchbox', { name: 'Find in transcript' });

    await waitFor(() => expect(document.activeElement).toBe(input));
  });
});
