// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Load State Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({
    subscribe: (run: (v: unknown) => void) => {
      run(value);
      return () => {};
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

import TranscriptLoadHost from './support/TranscriptLoadHost.svelte';
import { EMPTY_TRANSCRIPT, type DisplayTranscriptBlock, type TranscriptState } from '../src/shared/state/state.js';

const HELLO: DisplayTranscriptBlock = {
  id: 'block_load_hello_001',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'text',
  role: 'assistant',
  text: 'Hello from host',
};

const UNKNOWN: DisplayTranscriptBlock = {
  id: 'block_load_unknown_001',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'unknown',
  originalKind: 'future-block',
};

function transcript(partial: Partial<TranscriptState>): TranscriptState {
  return { ...EMPTY_TRANSCRIPT, sessionId: 'session_load_001', ...partial };
}

afterEach(() => {
  cleanup();
});

describe('transcript load taxonomy', () => {
  it('shows a named loading state instead of an empty conversation', () => {
    render(TranscriptLoadHost, {
      props: {
        transcript: transcript({ awaitingSnapshot: true, source: 'none' }),
        connection: 'connecting',
      },
    });
    expect(screen.getByText('Reading transcript')).toBeInTheDocument();
    expect(screen.queryByText('No transcript blocks are available yet.')).not.toBeInTheDocument();
  });

  it('never renders missing as an empty conversation', () => {
    render(TranscriptLoadHost, {
      props: {
        transcript: transcript({ gapReason: 'unknown-session' }),
        connection: 'live',
      },
    });
    expect(screen.getByText('Transcript missing')).toBeInTheDocument();
    expect(screen.queryByText('No transcript blocks are available yet.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Typed transcript')).not.toBeInTheDocument();
  });

  it('never renders unsupported as an empty conversation', () => {
    render(TranscriptLoadHost, {
      props: {
        transcript: transcript({ source: 'relay', blocks: [UNKNOWN] }),
        connection: 'live',
      },
    });
    expect(screen.getByText('Transcript unsupported')).toBeInTheDocument();
    expect(screen.queryByText('No transcript blocks are available yet.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Typed transcript')).not.toBeInTheDocument();
  });

  it('never renders error as an empty conversation', () => {
    render(TranscriptLoadHost, {
      props: {
        transcript: transcript({ error: 'The transcript could not be read.' }),
        connection: 'error',
      },
    });
    expect(screen.getByText('Transcript unreadable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('No transcript blocks are available yet.')).not.toBeInTheDocument();
  });

  it('keeps a rendered thread across reload instead of blanking it', async () => {
    const view = render(TranscriptLoadHost, {
      props: {
        transcript: transcript({ source: 'relay', blocks: [HELLO] }),
        connection: 'live',
      },
    });
    await waitFor(() => {
      expect(screen.getByText('Hello from host')).toBeInTheDocument();
    });

    await view.rerender({
      transcript: transcript({
        source: 'none',
        blocks: [],
        awaitingSnapshot: true,
      }),
      connection: 'reconnecting',
    });

    expect(screen.getByText('Hello from host')).toBeInTheDocument();
    expect(screen.queryByText('Reading transcript')).not.toBeInTheDocument();
    expect(screen.queryByText('No transcript blocks are available yet.')).not.toBeInTheDocument();
  });
});
