import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommandOutputCard } from '../src/rich-content/CommandOutputCard.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
} from '../src/rich-content/normalizeTranscriptBlocks.js';

afterEach(cleanup);

function commandBlock(): NormalizedCommandBlock {
  const blocks = normalizeTranscriptBlocks({
    sessionId: 'session-command-001',
    blocks: [
      {
        id: 'command-call-001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind: 'tool_call',
        toolName: 'bash',
        inputSummary: 'printf "[redacted]\\n"',
        callId: 'call-command-001',
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        redaction: { policyVersion: 1, fieldsRedacted: 1, reasons: ['command'] },
      },
      {
        id: 'command-result-001',
        revision: 1,
        seq: 2,
        occurredAt: '2026-08-17T04:00:01.000Z',
        kind: 'tool_result',
        toolName: 'bash',
        output: 'line one\nline two\nline three\nline four\nline five\nline six\nline seven\nline eight\nfinal exact line\n',
        isError: false,
        callId: 'call-command-001',
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        outputCompleteness: 'complete',
        redaction: { policyVersion: 1, fieldsRedacted: 1, reasons: ['output'] },
      },
    ] as readonly TranscriptBlock[],
  });
  const block = blocks.find(
    (candidate): candidate is NormalizedCommandBlock => candidate.kind === 'command',
  );
  if (block === undefined) throw new Error('Expected a command block.');
  return block;
}

describe('CommandOutputCard', () => {
  it('keeps command and output regions separate and copies exact canonical units', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onOpen = vi.fn();
    render(<CommandOutputCard block={commandBlock()} onOpen={onOpen} />);

    expect(screen.getByRole('heading', { name: 'Command' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Output' })).toBeInTheDocument();
    expect(screen.getByText('1 earlier lines clipped')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy output' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open full screen' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText).toHaveBeenNthCalledWith(1, 'printf "[redacted]\\n"');
    expect(writeText).toHaveBeenNthCalledWith(
      2,
      'line one\nline two\nline three\nline four\nline five\nline six\nline seven\nline eight\nfinal exact line\n',
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('hides copy actions when Clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<CommandOutputCard block={commandBlock()} onOpen={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Copy command' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy output' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open full screen' })).toBeInTheDocument();
  });
});
