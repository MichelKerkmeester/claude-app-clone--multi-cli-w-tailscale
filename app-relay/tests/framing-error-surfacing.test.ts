// ───────────────────────────────────────────────────────────────────
// MODULE: JSONL Framing Error Surfacing Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { StrictJsonlDecoder } from '../src/rpc/framing.js';

const MALFORMED_RECORD = '{"note":"token=raw-session-canary"';

describe('jsonl framing error surfacing', () => {
  it('reports a downstream throw as record handling rather than as a parse failure', () => {
    const errors: Error[] = [];
    const decoder = new StrictJsonlDecoder({
      onRecord: () => {
        throw new Error('Relay expected sequence 2 for epoch epoch_framing, received 3.');
      },
      onError: (error) => errors.push(error),
    });

    // A throw from the record handler must not escape the framing layer: it is
    // reported, because the stdout stream that feeds it has nowhere to catch it.
    expect(() => decoder.push('{"type":"agent_start"}\n')).not.toThrow();

    expect(errors).toHaveLength(1);
    const message = errors[0]?.message ?? '';
    // Mislabelling a downstream failure as a wire-format failure sends the next
    // reader to investigate the wrong layer.
    expect(message).not.toContain('parse failed');
    expect(message).toContain('record handling failed');
    expect(message).toContain('Relay expected sequence 2');
  });

  it('reports a malformed record by size without quoting its contents', () => {
    const errors: Error[] = [];
    const decoder = new StrictJsonlDecoder({
      onRecord: () => undefined,
      onError: (error) => errors.push(error),
    });

    decoder.push(`${MALFORMED_RECORD}\n`);

    expect(errors).toHaveLength(1);
    const message = errors[0]?.message ?? '';
    // These errors now reach the host's stderr, and a malformed record is still
    // session content — making errors audible must not make transcripts audible.
    expect(message).not.toContain('raw-session-canary');
    expect(message).not.toContain('note');
    expect(message).toContain(`${Buffer.byteLength(MALFORMED_RECORD, 'utf8')} bytes`);
  });
});
