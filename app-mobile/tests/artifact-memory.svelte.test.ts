// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT MEMORY TESTS
// ───────────────────────────────────────────────────────────────────

// Port of app-mobile/tests/artifact-memory.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React renderHook(useArtifactResource)
// probe is replaced by ArtifactResourceProbe.svelte, which mounts the runes
// factory inside a real component <script> and hands the live snapshot (with
// real bytes/buffer, not just DOM projections) to the test via onSnapshot —
// the Svelte equivalent of reading hook.result.current. The 8-iteration
// open/ready/close/unmount loop is ported faithfully: each iteration renders
// a fresh probe, awaits ready, asserts the verified bytes, calls close(),
// awaits closed, asserts bytes/buffer are purged, then unmounts.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactResource } from '../src/shared/transport/relay.js';
import type { ArtifactResourceSnapshot } from '../src/pages/chat/artifacts/use-artifact-resource.svelte.js';

import ArtifactResourceProbe from './support/ArtifactResourceProbe.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const DISPLAYED_BYTES = new TextEncoder().encode('sanitized-binary');

function block(): FilePreviewBlock {
  return {
    id: 'memory-preview-block',
    revision: 'rev_memory_preview',
    seq: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    kind: 'file_preview',
    artifactId: 'artifact_memory_preview',
    displayName: 'bounded.png',
    renderer: 'image',
    mimeType: 'image/png',
    byteLength: DISPLAYED_BYTES.byteLength,
    digest: sha256('sanitized-binary'),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: true,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('binary artifact lifecycle', () => {
  it('purges verified binary bytes after every close across repeated opens', async () => {
    const source = block();
    const read = vi.fn(async (): Promise<ArtifactResource> => ({
      bytes: DISPLAYED_BYTES.slice(),
      contentType: source.mimeType,
      revision: source.revision,
      etag: `"${source.digest}"`,
      digest: source.digest,
    }));

    for (let iteration = 0; iteration < 8; iteration += 1) {
      let snapshot: ArtifactResourceSnapshot | null = null;
      const view = render(ArtifactResourceProbe, {
        props: {
          sessionId: 'session_memory_preview',
          block: source,
          read,
          onSnapshot: (value: ArtifactResourceSnapshot) => {
            snapshot = value;
          },
        },
      });
      await waitFor(() => expect(snapshot?.status).toBe('ready'));
      expect(snapshot?.bytes).toEqual(DISPLAYED_BYTES);
      snapshot?.close();
      await waitFor(() => expect(snapshot?.status).toBe('closed'));
      expect(snapshot?.bytes).toBeNull();
      expect(snapshot?.buffer).toBeNull();
      view.unmount();
    }
    expect(read).toHaveBeenCalledTimes(8);
  });
});
