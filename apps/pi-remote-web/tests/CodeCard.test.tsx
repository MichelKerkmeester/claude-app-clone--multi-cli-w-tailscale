import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeCard } from '../src/rich-content/CodeCard.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
} from '../src/rich-content/normalizeTranscriptBlocks.js';

afterEach(cleanup);

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
  }).filter(
    (candidate): candidate is NormalizedCodeBlock => candidate.kind === 'code',
  );
  if (block === undefined) throw new Error('Expected a code block.');
  return block;
}

describe('CodeCard', () => {
  it('uses escaped plaintext without line numbers and copies the canonical source', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const block = codeBlock();
    render(<CodeCard block={block} onOpen={() => undefined} />);
    const code = document.querySelector('pre code');
    if (code === null) throw new Error('Expected code preview.');
    expect(code.textContent).toContain('const line0 = 0;');
    expect(code.textContent).not.toContain('1 const');
    expect(screen.getByText('2 more lines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(block.canonicalSource));
  });
});
