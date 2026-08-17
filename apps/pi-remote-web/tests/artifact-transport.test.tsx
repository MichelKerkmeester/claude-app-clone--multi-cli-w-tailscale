import { webcrypto } from 'node:crypto';

import { sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactReadError, readArtifact } from '../src/relay.js';

const BODY = 'safe exact revision bytes\n';
const BLOCK: FilePreviewBlock = {
  id: 'block_transport_001',
  revision: 'rev_transport_001',
  seq: 1,
  occurredAt: '2026-01-01T00:00:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_transport_001',
  displayName: 'safe.txt',
  renderer: 'text',
  mimeType: 'text/plain',
  byteLength: new TextEncoder().encode(BODY).byteLength,
  digest: sha256(BODY),
  redaction: 'applied',
  completeness: 'complete',
  shareAllowed: false,
  availability: 'ready',
  content: { kind: 'artifact-ref' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('direct exact artifact transport', () => {
  it('uses a GET exact tuple and validates body, digest, revision, ETag and headers', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        '/api/sessions/session_transport_001/artifacts/artifact_transport_001/revisions/rev_transport_001',
      );
      expect(init?.method).toBe('GET');
      expect(init?.cache).toBe('no-store');
      expect(init?.credentials).toBe('same-origin');
      return new Response(BODY, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': String(BLOCK.byteLength),
          'cache-control': 'private, no-store, max-age=0',
          'x-content-type-options': 'nosniff',
          'cross-origin-resource-policy': 'same-origin',
          'x-artifact-revision': BLOCK.revision,
          etag: `"${BLOCK.digest}"`,
        },
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const resource = await readArtifact('session_transport_001', BLOCK);
    expect(new TextDecoder().decode(resource.bytes)).toBe(BODY);
    expect(resource.digest).toBe(BLOCK.digest);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects a response whose exact revision identity changes', async () => {
    vi.stubGlobal('crypto', webcrypto);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(BODY, {
          status: 200,
          headers: {
            'content-type': 'text/plain',
            'cache-control': 'private, no-store, max-age=0',
            'x-content-type-options': 'nosniff',
            'cross-origin-resource-policy': 'same-origin',
            'x-artifact-revision': 'rev_other_001',
            etag: `"${BLOCK.digest}"`,
          },
        }),
      ),
    );

    await expect(readArtifact('session_transport_001', BLOCK)).rejects.toMatchObject<ArtifactReadError>({
      code: 'revision-conflict',
    });
  });
});
