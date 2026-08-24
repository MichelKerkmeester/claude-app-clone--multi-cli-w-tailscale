// Port of app-mobile/tests/viewer-races.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React renderHook() probe is
// replaced by ArtifactResourceProbe.svelte, which mounts the runes factory
// useArtifactResource inside a real component <script> and renders the
// snapshot fields (status, objectUrl, identityKey, bytes) into the DOM; the
// Reload/Close buttons expose the snapshot's reload()/close() actions, and
// view.rerender({ block }) drives the block-prop change path the React
// hook.rerender exercised. The out-of-order resolution race (test 4) is
// ported faithfully: older resolves before newer, and the factory's
// generation guard must keep the older response from committing.

// ───────────────────────────────────────────────────────────────────
// MODULE: VIEWER RACES TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactResource } from '../src/shared/transport/relay.js';

import {
  clearArtifactResourceStore,
} from '../src/pages/chat/artifacts/use-artifact-resource.svelte.js';

import ArtifactResourceProbe from './support/ArtifactResourceProbe.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

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
  clearArtifactResourceStore();
  restoreUrlStubs?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('verified viewer races', () => {
  it('keeps the full URL absent until length, digest, headers, and decode complete', async () => {
    const urls = installImageGate();
    let resolveRead!: (value: ArtifactResource) => void;
    const pending = new Promise<ArtifactResource>((resolve) => {
      resolveRead = resolve;
    });
    const read = vi.fn(() => pending);
    render(ArtifactResourceProbe, {
      props: { sessionId: 'session_phase_race', block: IMAGE, read, requireImageDecode: true },
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('loading'));
    expect(screen.getByTestId('object-url')).toHaveTextContent('');
    resolveRead(resourceFor());
    await pending;
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(urls.close).toHaveBeenCalledOnce();
    expect(urls.createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByTestId('object-url')).toHaveTextContent('blob:phase-race');
  });

  it('commits no full pixels when the content digest is wrong', async () => {
    const urls = installImageGate();
    const decode = urls.close;
    const read = vi.fn(async () => resourceFor({ contentDigest: '0'.repeat(64) }));
    render(ArtifactResourceProbe, {
      props: { sessionId: 'session_phase_race', block: IMAGE, read, requireImageDecode: true },
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('corrupt'));
    expect(screen.getByTestId('bytes-length')).toHaveTextContent('');
    expect(screen.getByTestId('object-url')).toHaveTextContent('');
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it('allows only one explicit retry for a frozen exact revision', async () => {
    installImageGate();
    const stale = Object.assign(new Error('revision conflict'), { code: 'revision-conflict' });
    const read = vi.fn().mockRejectedValueOnce(stale).mockResolvedValueOnce(resourceFor());
    render(ArtifactResourceProbe, {
      props: { sessionId: 'session_phase_race', block: IMAGE, read, requireImageDecode: true },
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('stale'));
    await fireEvent.click(screen.getByTestId('reload'));
    await fireEvent.click(screen.getByTestId('reload'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
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
    const view = render(ArtifactResourceProbe, {
      props: { sessionId: 'session_phase_race', block: older, read },
    });
    await view.rerender({ block: newer });
    resolveOlder(resourceFor());
    resolveNewer(resourceFor());
    await Promise.all([olderPromise, newerPromise]);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('identity-key').textContent).toContain('artifact_phase_viewer_race');
  });
});
