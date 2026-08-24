// ───────────────────────────────────────────────────────────────────
// MODULE: CARD COMMAND OUTPUT TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import CommandOutputCard, {
  reconcileCommandSnapshot,
} from '../src/pages/chat/rich-content/card-command-output.svelte';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
} from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

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
        output:
          'line one\nline two\nline three\nline four\nline five\nline six\nline seven\nline eight\nfinal exact line\n',
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

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('CommandOutputCard', () => {
  it('keeps command and output regions separate and copies exact canonical units', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const onOpen = vi.fn();
    render(CommandOutputCard, { props: { block: commandBlock(), onOpen } });

    expect(screen.getByRole('heading', { name: 'Command' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Output' })).toBeInTheDocument();
    expect(screen.getByText('1 earlier lines clipped')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Copy command' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Copy output' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Open full screen' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText).toHaveBeenNthCalledWith(1, 'printf "[redacted]\\n"');
    expect(writeText).toHaveBeenNthCalledWith(
      2,
      'line one\nline two\nline three\nline four\nline five\nline six\nline seven\nline eight\nfinal exact line\n',
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0]?.[0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('hides copy actions when Clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(CommandOutputCard, { props: { block: commandBlock(), onOpen: () => undefined } });
    expect(screen.queryByRole('button', { name: 'Copy command' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy output' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open full screen' })).toBeInTheDocument();
  });

  it('keeps the last trustworthy snapshot when an older revision arrives', () => {
    const current = commandBlock();
    const snapshot = reconcileCommandSnapshot(null, current);
    const stale = {
      ...current,
      revision: 0,
      canonicalCommand: 'stale command',
      canonicalOutput: 'stale output',
    };

    expect(reconcileCommandSnapshot(snapshot, stale)).toBe(snapshot);
  });

  it('labels cached running output as a connection-loss snapshot', () => {
    const block = { ...commandBlock(), source: 'cache' as const, lifecycle: 'running' as const };
    render(CommandOutputCard, { props: { block } });
    expect(screen.getAllByText(/Connection lost/u).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stale cache/u).length).toBeGreaterThan(0);
  });
});
