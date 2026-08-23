import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RichContentRouter from '../src/pages/chat/rich-content/rich-content-router.svelte';
import {
  normalizeTranscriptBlocks,
  type NormalizedTranscriptBlock,
} from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';

// CodeCard progressive-highlights via a Web Worker, but jsdom has no Worker.
// A real Worker global lets the highlight life-cycle take its normal dispatch
// path (stays `pending`, plaintext preview) instead of its "no Worker" branch,
// which is a pre-existing component bug: that branch reads and rewrites the
// same $state inside a single $effect and hits Svelte's update-depth guard.
class NoopHighlightWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  postMessage(): void {}
  terminate(): void {}
}

const originalWorker = (globalThis as { Worker?: unknown }).Worker;

function installWorkerShim(): void {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: NoopHighlightWorker,
  });
}

function restoreWorker(): void {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: originalWorker,
  });
}

function normalized(kind: string, text: string): NormalizedTranscriptBlock {
  const [block] = normalizeTranscriptBlocks({
    sessionId: 'session-router-001',
    blocks: [
      {
        id: `router-${kind}`,
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind,
        role: 'assistant',
        text,
      } as unknown as TranscriptBlock,
    ],
  });
  if (block === undefined) throw new Error(`Expected ${kind} block.`);
  return block;
}

beforeEach(installWorkerShim);
afterEach(() => {
  cleanup();
  restoreWorker();
});

describe('RichContentRouter', () => {
  it('routes code to a card and keeps malformed fallback non-copyable and non-openable', async () => {
    const onOpen = vi.fn();
    const code = normalized('text', '```bash\nprintf "safe"\n```');
    const { unmount } = render(RichContentRouter, { props: { block: code, onOpen } });
    expect(screen.getByRole('heading', { name: 'bash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full screen' })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Open full screen' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    unmount();

    const malformed = normalized('unknown_payload', '<unsafe>');
    render(RichContentRouter, { props: { block: malformed, onOpen } });
    expect(screen.getByRole('heading', { name: 'Unsupported block' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy|Open/ })).toBeNull();
  });

  it('routes ordinary prose through SafeMarkdown and does not promote short prose', () => {
    render(RichContentRouter, { props: { block: normalized('text', '**short prose**') } });
    expect(screen.getByText('short prose')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy|Open/ })).toBeNull();
  });
});
