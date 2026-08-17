import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactResource } from '../src/relay.js';
import {
  clearArtifactResourceStore,
  useArtifactResource,
} from '../src/artifacts/useArtifactResource.js';

const BYTES = new TextEncoder().encode('verified phase image');
const DIGEST = sha256('verified phase image');
const IMAGE: InboundImageReadyBlock = {
  id: 'block_phase_viewer_race',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_phase_viewer_race',
    revision: 'rev_phase_viewer_race',
    expiresAt: '2026-08-17T11:00:00.000Z',
    full: {
      digest: DIGEST,
      mediaType: 'image/png',
      width: 100,
      height: 80,
      byteLength: BYTES.byteLength,
    },
    thumbnail: {
      digest: DIGEST,
      mediaType: 'image/png',
      width: 50,
      height: 40,
      byteLength: BYTES.byteLength,
    },
  },
  presentation: { safeAlt: 'Race image' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

function resourceFor(overrides: Partial<ArtifactResource> = {}): ArtifactResource {
  return {
    bytes: BYTES.slice(),
    contentType: 'image/png',
    revision: IMAGE.artifact.revision,
    etag: `"${DIGEST}"`,
    digest: DIGEST,
    contentDigest: DIGEST,
    ...overrides,
  };
}

let restoreUrlStubs: (() => void) | null = null;

function installImageGate() {
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ close })),
  );
  const createObjectURL = vi.fn(() => 'blob:phase-race');
  const revokeObjectURL = vi.fn();
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  restoreUrlStubs = () => {
    if (createDescriptor === undefined) delete (URL as { createObjectURL?: unknown }).createObjectURL;
    else Object.defineProperty(URL, 'createObjectURL', createDescriptor);
    if (revokeDescriptor === undefined) delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
    else Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
    restoreUrlStubs = null;
  };
  return { close, createObjectURL, revokeObjectURL };
}

afterEach(() => {
  cleanup();
  clearArtifactResourceStore();
  restoreUrlStubs?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('verified viewer races', () => {
  it('keeps the full URL absent until length, digest, headers, and decode complete', async () => {
    const urls = installImageGate();
    let resolveRead!: (value: ArtifactResource) => void;
    const pending = new Promise<ArtifactResource>((resolve) => {
      resolveRead = resolve;
    });
    const read = vi.fn(() => pending);
    const hook = renderHook(() =>
      useArtifactResource('session_phase_race', IMAGE, {
        read,
        variant: 'full',
        requireImageDecode: true,
      }),
    );

    expect(hook.result.current.objectUrl).toBeNull();
    await act(async () => {
      resolveRead(resourceFor());
      await pending;
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(urls.close).toHaveBeenCalledOnce();
    expect(urls.createObjectURL).toHaveBeenCalledOnce();
    expect(hook.result.current.objectUrl).toBe('blob:phase-race');
  });

  it('commits no full pixels when the content digest is wrong', async () => {
    const urls = installImageGate();
    const decode = urls.close;
    const read = vi.fn(async () => resourceFor({ contentDigest: '0'.repeat(64) }));
    const hook = renderHook(() =>
      useArtifactResource('session_phase_race', IMAGE, {
        read,
        requireImageDecode: true,
      }),
    );

    await waitFor(() => expect(hook.result.current.status).toBe('corrupt'));
    expect(hook.result.current.bytes).toBeNull();
    expect(hook.result.current.objectUrl).toBeNull();
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it('allows only one explicit retry for a frozen exact revision', async () => {
    installImageGate();
    const stale = Object.assign(new Error('revision conflict'), { code: 'revision-conflict' });
    const read = vi.fn().mockRejectedValueOnce(stale).mockResolvedValueOnce(resourceFor());
    const hook = renderHook(() =>
      useArtifactResource('session_phase_race', IMAGE, {
        read,
        requireImageDecode: true,
      }),
    );

    await waitFor(() => expect(hook.result.current.status).toBe('stale'));
    act(() => {
      hook.result.current.reload();
      hook.result.current.reload();
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('does not allow an older response to replace the current identity', async () => {
    installImageGate();
    const older = { ...IMAGE, id: 'older-block' };
    const newer = { ...IMAGE, id: 'newer-block' };
    let resolveOlder!: (value: ArtifactResource) => void;
    let resolveNewer!: (value: ArtifactResource) => void;
    const olderPromise = new Promise<ArtifactResource>((resolve) => {
      resolveOlder = resolve;
    });
    const newerPromise = new Promise<ArtifactResource>((resolve) => {
      resolveNewer = resolve;
    });
    const read = vi.fn((_session: string, block: InboundImageReadyBlock) =>
      block.id === older.id ? olderPromise : newerPromise,
    );
    const hook = renderHook(
      ({ block }) => useArtifactResource('session_phase_race', block, { read }),
      { initialProps: { block: older } },
    );
    hook.rerender({ block: newer });
    await act(async () => {
      resolveOlder(resourceFor());
      resolveNewer(resourceFor());
      await Promise.all([olderPromise, newerPromise]);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.identityKey).toContain('artifact_phase_viewer_race');
  });
});
