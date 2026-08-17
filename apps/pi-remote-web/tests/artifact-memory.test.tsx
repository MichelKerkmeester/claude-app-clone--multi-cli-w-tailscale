import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactResource } from '../src/relay.js';
import { useArtifactResource } from '../src/artifacts/useArtifactResource.js';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
      const hook = renderHook(() =>
        useArtifactResource('session_memory_preview', source, { read }),
      );
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      expect(hook.result.current.bytes).toEqual(DISPLAYED_BYTES);
      act(() => hook.result.current.close());
      expect(hook.result.current.status).toBe('closed');
      expect(hook.result.current.bytes).toBeNull();
      expect(hook.result.current.buffer).toBeNull();
      hook.unmount();
    }
    expect(read).toHaveBeenCalledTimes(8);
  });
});

