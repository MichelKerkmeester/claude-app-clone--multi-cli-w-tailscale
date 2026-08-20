import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FilePreviewBlock, type SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import { installCacheRevalidation, loadCache, saveCache } from '../src/cache.js';
import { EMPTY_TRANSCRIPT } from '../src/state.js';
import type { ArtifactResource } from '../src/relay.js';
import { useArtifactResource } from '../src/artifacts/useArtifactResource.js';

function block(id: string, revision: string, text = 'body'): FilePreviewBlock {
  return {
    id,
    revision,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'file_preview',
    artifactId: 'artifact_' + id,
    displayName: id + '.txt',
    renderer: 'text',
    mimeType: 'text/plain',
    byteLength: new TextEncoder().encode(text).byteLength,
    digest: sha256(text),
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: true,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
  };
}

function resourceFor(source: FilePreviewBlock, text: string): ArtifactResource {
  return {
    bytes: new TextEncoder().encode(text),
    contentType: source.mimeType,
    revision: source.revision,
    etag: `"${source.digest}"`,
    digest: source.digest,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useArtifactResource', () => {
  it('keeps delayed A and B resources isolated by exact identity', async () => {
    const first = block('artifact_a', 'rev_a', 'A_BYTES');
    const second = block('artifact_b', 'rev_b', 'B_BYTES');
    const firstRead = deferred<ArtifactResource>();
    const secondRead = deferred<ArtifactResource>();
    const read = vi.fn((_sessionId: string, requested: FilePreviewBlock) =>
      requested.artifactId === first.artifactId ? firstRead.promise : secondRead.promise,
    );
    const hook = renderHook(
      ({ current }) => useArtifactResource('session_resource_001', current, { read }),
      { initialProps: { current: first } },
    );

    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    hook.rerender({ current: second });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () => {
      firstRead.resolve(resourceFor(first, 'A_BYTES'));
      await firstRead.promise;
    });
    expect(hook.result.current.buffer).toBeNull();
    await act(async () => {
      secondRead.resolve(resourceFor(second, 'B_BYTES'));
      await secondRead.promise;
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.buffer).toBe('B_BYTES');
    expect(hook.result.current.identityKey).toContain(second.artifactId);
    expect(hook.result.current.buffer).not.toContain('A_BYTES');
  });

  it('aborts and closes a request before a delayed response can commit', async () => {
    const source = block('artifact_close', 'rev_close', 'CLOSE_BYTES');
    const pending = deferred<ArtifactResource>();
    const read = vi.fn((_sessionId: string, _block: FilePreviewBlock, signal: AbortSignal) => {
      signal.addEventListener('abort', () =>
        pending.reject(new DOMException('aborted', 'AbortError')),
      );
      return pending.promise;
    });
    const hook = renderHook(() => useArtifactResource('session_resource_001', source, { read }));
    await waitFor(() => expect(read).toHaveBeenCalled());
    const signal = read.mock.calls[0]?.[2];
    act(() => hook.result.current.close());
    expect(signal?.aborted).toBe(true);
    expect(hook.result.current.status).toBe('closed');
    await act(async () => {
      pending.resolve(resourceFor(source, 'CLOSE_BYTES'));
      await pending.promise.catch(() => undefined);
    });
    expect(hook.result.current.buffer).toBeNull();
  });

  it('rejects a digest mismatch before text is committed', async () => {
    const source = block('artifact_digest', 'rev_digest', 'EXPECTED_BYTES');
    const badBytes = new TextEncoder().encode('TAMPERED_BYTES');
    const read = vi.fn(async () => ({
      bytes: badBytes,
      contentType: source.mimeType,
      revision: source.revision,
      etag: `"${source.digest}"`,
      digest: source.digest,
    }));
    const hook = renderHook(() => useArtifactResource('session_resource_001', source, { read }));
    await waitFor(() => expect(hook.result.current.status).toBe('corrupt'));
    expect(hook.result.current.buffer).toBeNull();
    expect(hook.result.current.text).toBeNull();
  });

  it('retries a stale exact revision only after an explicit reload', async () => {
    const source = block('artifact_stale', 'rev_stale', 'FRESH_BYTES');
    const stale = Object.assign(new Error('stale'), { code: 'revision-conflict' });
    const read = vi
      .fn()
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce(resourceFor(source, 'FRESH_BYTES'));
    const hook = renderHook(() => useArtifactResource('session_resource_001', source, { read }));
    await waitFor(() => expect(hook.result.current.status).toBe('stale'));
    expect(hook.result.current.buffer).toBeNull();
    act(() => hook.result.current.reload());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(read).toHaveBeenCalledTimes(2);
    expect(hook.result.current.buffer).toBe('FRESH_BYTES');
  });

  it('stores only bounded preview metadata and never bodies, URLs, or buffers', () => {
    const source = block('artifact_cache_boundary', 'rev_cache', 'CACHE_BODY_CANARY');
    const session: SessionCardDto = {
      id: 'session_cache_001',
      status: 'idle',
      updatedAt: '2026-08-17T10:00:00.000Z',
      messageCount: 1,
    };
    saveCache([session], {
      ...EMPTY_TRANSCRIPT,
      sessionId: 'session_cache_001',
      source: 'relay',
      blocks: [source],
    });
    const serialized = localStorage.getItem('pi-remote.read-only.v1') ?? '';
    expect(serialized).not.toContain('CACHE_BODY_CANARY');
    expect(serialized).not.toContain(source.artifactId);
    expect(serialized).not.toContain('blob:');
    expect(serialized).not.toContain('shareBuffer');
    expect(loadCache()?.transcripts[0]?.artifactMetadata[0]?.displayName).toBe(source.displayName);
  });

  it('revalidates the live exact-revision transcript after bfcache restoration', () => {
    const restore = vi.fn();
    const removeListener = installCacheRevalidation(restore);
    const regularPageShow = new Event('pageshow');
    const restoredPageShow = new Event('pageshow');
    Object.defineProperty(restoredPageShow, 'persisted', { value: true });
    window.dispatchEvent(regularPageShow);
    window.dispatchEvent(restoredPageShow);
    expect(restore).toHaveBeenCalledTimes(1);
    removeListener();
    window.dispatchEvent(restoredPageShow);
    expect(restore).toHaveBeenCalledTimes(1);
  });
});
