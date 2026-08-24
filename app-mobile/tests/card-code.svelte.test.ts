import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CodeCard from '../src/pages/chat/rich-content/card-code.svelte';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
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

function codeBlock(): NormalizedCodeBlock {
  const source = [
    'Intro',
    '',
    '```typescript',
    ...Array.from({ length: 14 }, (_, index) => `const line${index} = ${index};`),
    '```',
  ].join('\n');
  const [block] = normalizeTranscriptBlocks({
    sessionId: 'session-code-001',
    blocks: [
      {
        id: 'code-source-001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind: 'text',
        role: 'assistant',
        text: source,
      },
    ] as readonly TranscriptBlock[],
  }).filter((candidate): candidate is NormalizedCodeBlock => candidate.kind === 'code');
  if (block === undefined) throw new Error('Expected a code block.');
  return block;
}

beforeEach(installWorkerShim);
afterEach(() => {
  cleanup();
  restoreWorker();
});

describe('CodeCard', () => {
  it('uses escaped plaintext without line numbers and copies the canonical source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const block = codeBlock();
    render(CodeCard, { props: { block, onOpen: () => undefined } });
    const code = document.querySelector('pre code');
    if (code === null) throw new Error('Expected code preview.');
    expect(code.textContent).toContain('const line0 = 0;');
    expect(code.textContent).not.toContain('1 const');
    expect(screen.getByText('2 more lines')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(block.canonicalSource));
  });
});