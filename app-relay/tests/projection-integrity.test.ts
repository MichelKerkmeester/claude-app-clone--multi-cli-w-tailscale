// ───────────────────────────────────────────────────────────────────
// MODULE: Projection Sequence Integrity Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { PiRpcEvent } from '@pi-remote/pi-rpc-protocol';

import { publishPiEvent } from '../src/index.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;

const EPOCH = 'epoch_projection_integrity';

// An extension asks for plan input carrying neither a title nor a message, so the
// projector falls back to the method name and the store recognises the result as
// control-plane residue and drops it. The artifact behind it in the same batch is
// ordinary user content and must still reach the reader.
const CONTROL_RESIDUE_WITH_TRAILING_ARTIFACT = {
  type: 'extension_ui_request',
  method: 'setPlan',
  artifactSnapshot: {
    approved: true,
    artifactId: 'artifact_projection_integrity',
    revision: 'rev-projection-integrity-001',
    displayName: 'fixture.txt',
    renderer: 'text',
    mimeType: 'text/plain',
    text: 'the artifact a reader never sees',
    inlineText: true,
    firstLine: 1,
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: true,
  },
} as unknown as PiRpcEvent;

describe('projection sequence integrity', () => {
  it('delivers a block that follows a dropped control-plane projection in the same batch', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      publishPiEvent(
        store,
        hub,
        new TranscriptProjector(),
        CONTROL_RESIDUE_WITH_TRAILING_ARTIFACT,
        EPOCH,
      );

      const page = store.getTranscriptPage(IDENTITY);
      const kinds = page.items.map((item) => item.kind);

      // The artifact is the block a reader would otherwise see referenced and never rendered.
      expect(kinds).toContain('file_preview');
      // The control-plane residue stays suppressed: delivering the artifact must not
      // be bought by persisting the block the store deliberately declines.
      expect(JSON.stringify(page)).not.toContain('Extension requested');
    } finally {
      store.close();
    }
  });

  it('keeps persisted sequences contiguous when a projection is declined', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      publishPiEvent(
        store,
        hub,
        new TranscriptProjector(),
        CONTROL_RESIDUE_WITH_TRAILING_ARTIFACT,
        EPOCH,
      );

      const sequences = store
        .createSyncPlan(IDENTITY)
        .messages.flatMap((message) =>
          'envelopes' in message ? message.envelopes.map((envelope) => envelope.seq) : [],
        );

      expect(sequences.length).toBeGreaterThan(0);
      expect(sequences).toEqual(sequences.map((_, index) => index + 1));
    } finally {
      store.close();
    }
  });
});
