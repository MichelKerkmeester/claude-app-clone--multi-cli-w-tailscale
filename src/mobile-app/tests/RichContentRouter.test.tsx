import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RichContentRouter } from '../src/rich-content/RichContentRouter.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTranscriptBlock,
} from '../src/rich-content/normalizeTranscriptBlocks.js';

afterEach(cleanup);

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

describe('RichContentRouter', () => {
  it('routes code to a card and keeps malformed fallback non-copyable and non-openable', () => {
    const onOpen = vi.fn();
    const code = normalized('text', '```bash\nprintf "safe"\n```');
    const { unmount } = render(<RichContentRouter block={code} onOpen={onOpen} />);
    expect(screen.getByRole('heading', { name: 'bash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open full screen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open full screen' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    unmount();

    const malformed = normalized('unknown_payload', '<unsafe>');
    render(<RichContentRouter block={malformed} onOpen={onOpen} />);
    expect(screen.getByRole('heading', { name: 'Unsupported block' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy|Open/ })).toBeNull();
  });

  it('routes ordinary prose through SafeMarkdown and does not promote short prose', () => {
    render(<RichContentRouter block={normalized('text', '**short prose**')} />);
    expect(screen.getByText('short prose')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy|Open/ })).toBeNull();
  });
});
