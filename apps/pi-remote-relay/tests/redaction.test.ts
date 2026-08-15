// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Redaction Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { Envelope } from '@pi-remote/pi-rpc-protocol';

import { redactEnvelope } from '../src/store/redaction.js';

function envelopeWith(payload: Envelope['payload']): Envelope {
  return {
    v: 1,
    eventId: 'event_redaction',
    kind: 'pi.tool_execution_end',
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: 'session_local',
    epoch: 'epoch_redaction',
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('canonical redaction', () => {
  it('removes path fields, private prompts and secret fields recursively', () => {
    const redacted = redactEnvelope(
      envelopeWith({
        cwd: '/Users/alice/private-project',
        prompt: 'private request',
        nested: {
          apiKey: 'sk-example-secret-value',
          output: 'read /Users/alice/private-project/file.ts with token=abc123',
        },
      }),
    );
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain('/Users/alice');
    expect(serialized).not.toContain('private request');
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('sk-example-secret-value');
    expect(serialized).toContain('[REDACTED_PATH]');
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(redacted.redaction.fieldsRedacted).toBeGreaterThanOrEqual(4);
    expect(redacted.redaction.reasons).toEqual(['path', 'private-text', 'secret']);
  });

  it('does not mutate the incoming envelope', () => {
    const source = envelopeWith({ path: '/tmp/source.txt' });
    const redacted = redactEnvelope(source);

    expect(source.payload).toEqual({ path: '/tmp/source.txt' });
    expect(redacted.payload).toEqual({ path: '[REDACTED_PATH]' });
  });
});
