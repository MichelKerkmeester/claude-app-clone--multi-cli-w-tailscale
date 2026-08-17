import type { TextArtifactBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextArtifactCard } from '../src/rich-content/TextArtifactCard.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTextArtifactBlock,
} from '../src/rich-content/normalizeTranscriptBlocks.js';

afterEach(cleanup);

function artifactBlock(): NormalizedTextArtifactBlock {
  const [block] = normalizeTranscriptBlocks({
    sessionId: 'session-text-001',
    blocks: [
      {
        id: 'artifact-001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind: 'text_artifact',
        label: 'document',
        source: 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n',
        redaction: { policyVersion: 1, fieldsRedacted: 1, reasons: ['document'] },
      },
    ] as readonly TextArtifactBlock[],
  }).filter(
    (candidate): candidate is NormalizedTextArtifactBlock => candidate.kind === 'text-artifact',
  );
  if (block === undefined) throw new Error('Expected a text artifact.');
  return block;
}

describe('TextArtifactCard', () => {
  it('uses trusted labels, a six-line preview, and exact text copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const block = artifactBlock();
    render(<TextArtifactCard block={block} onOpen={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Document' })).toBeInTheDocument();
    expect(screen.getByText('1 more lines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n'),
    );
  });
});
