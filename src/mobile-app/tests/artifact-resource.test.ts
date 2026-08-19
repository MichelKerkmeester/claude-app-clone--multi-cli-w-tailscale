import { createElement, StrictMode, type ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import {
  clearArtifactResourceStore,
  useArtifactResource,
} from '../src/artifacts/useArtifactResource.js';
import { readArtifact } from '../src/relay.js';
import type { ArtifactResource } from '../src/relay.js';

const IMAGE_TEXT = 'verified image bytes';
const IMAGE_BYTES = new TextEncoder().encode(IMAGE_TEXT);
const IMAGE_DIGEST = sha256(IMAGE_TEXT);

const IMAGE_BLOCK: FilePreviewBlock = {
  id: 'block_resource_001',
  revision: 'rev_resource_001',
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_resource_001',
  displayName: 'Screenshot',
  renderer: 'image',
  mimeType: 'image/png',
  byteLength: IMAGE_BYTES.byteLength,
  digest: IMAGE_DIGEST,
  redaction: 'applied',
  completeness: 'complete',
  shareAllowed: false,
  availability: 'ready',
  content: { kind: 'artifact-ref' },
};

function resourceFor(bytes = IMAGE_BYTES): ArtifactResource {
  return {
    bytes: bytes.slice(),
    contentType: IMAGE_BLOCK.mimeType,
    revision: IMAGE_BLOCK.revision,
    etag: `"${IMAGE_BLOCK.digest}"`,
    digest: IMAGE_BLOCK.digest,
    contentDigest: IMAGE_BLOCK.digest,
  };
}

function installUrlStubs() {
  const urlObject = URL as typeof URL & {
    createObjectURL?: (value: Blob) => string;
    revokeObjectURL?: (value: string) => void;
  };
  const createDescriptor = Object.getOwnPropertyDescriptor(urlObject, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(urlObject, 'revokeObjectURL');
  const createObjectURL = vi.fn(() => 'blob:verified-resource');
  const revokeObjectURL = vi.fn();
  Object.defineProperty(urlObject, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(urlObject, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  });
  return {
    createObjectURL,
    revokeObjectURL,
    restore() {
      if (createDescriptor === undefined) delete urlObject.createObjectURL;
      else Object.defineProperty(urlObject, 'createObjectURL', createDescriptor);
      if (revokeDescriptor === undefined) delete urlObject.revokeObjectURL;
      else Object.defineProperty(urlObject, 'revokeObjectURL', revokeDescriptor);
    },
  };
}

function installImageDecode(onDecode: () => void = () => undefined) {
  class ImageStub {
    async decode(): Promise<void> {
      onDecode();
    }
  }
  vi.stubGlobal('Image', ImageStub);
}

async function contentDigestHeader(value: Uint8Array): Promise<string> {
  const hash = await webcrypto.subtle.digest('SHA-256', value.slice());
  const encoded = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `sha-256=:${encoded}:`;
}

afterEach(() => {
  cleanup();
  clearArtifactResourceStore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('verified artifact resources', () => {
  it('uses the exact POST read tuple and rejects redirects through the browser fetch contract', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/artifacts/read');
      expect(init?.method).toBe('POST');
      expect(init?.credentials).toBe('same-origin');
      expect(init?.cache).toBe('no-store');
      expect(init?.redirect).toBe('error');
      expect(JSON.parse(String(init?.body))).toEqual({
        sessionId: 'session_resource_001',
        artifactId: IMAGE_BLOCK.artifactId,
        revision: IMAGE_BLOCK.revision,
        variant: 'full',
      });
      return new Response(IMAGE_BYTES, {
        status: 200,
        headers: {
          'content-type': IMAGE_BLOCK.mimeType,
          'content-length': String(IMAGE_BYTES.byteLength),
          'content-digest': await contentDigestHeader(IMAGE_BYTES),
          etag: `"${IMAGE_DIGEST}"`,
          'content-disposition': 'attachment; filename="pi-preview.png"',
          'cache-control': 'private, no-store, max-age=0',
          'x-content-type-options': 'nosniff',
          'cross-origin-resource-policy': 'same-origin',
          'referrer-policy': 'no-referrer',
        },
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const resource = await readArtifact('session_resource_001', IMAGE_BLOCK, undefined, 'full');
    expect(resource.digest).toBe(IMAGE_DIGEST);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('does not create an object URL before decode, and exposes the URL only after the full gate', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const urls = installUrlStubs();
    const events: string[] = [];
    installImageDecode(() => events.push('decode'));
    const read = vi.fn(async () => resourceFor());
    const hook = renderHook(() =>
      useArtifactResource('session_resource_001', IMAGE_BLOCK, {
        read,
        requireImageDecode: true,
      }),
    );

    expect(urls.createObjectURL).not.toHaveBeenCalled();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    events.push('url');
    expect(hook.result.current.objectUrl).toBe('blob:verified-resource');
    expect(events).toEqual(['decode', 'url']);
    expect(urls.createObjectURL).toHaveBeenCalledOnce();
    hook.unmount();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:verified-resource');
    urls.restore();
  });

  it('commits zero pixels when a served byte flips before the digest and decode gates', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const urls = installUrlStubs();
    const decode = vi.fn();
    installImageDecode(decode);
    const flipped = IMAGE_BYTES.slice();
    flipped[0] = flipped[0] ^ 0xff;
    const read = vi.fn(async () => resourceFor(flipped));
    const hook = renderHook(() =>
      useArtifactResource('session_resource_001', IMAGE_BLOCK, {
        read,
        requireImageDecode: true,
      }),
    );

    await waitFor(() => expect(hook.result.current.status).toBe('corrupt'));
    expect(hook.result.current.bytes).toBeNull();
    expect(hook.result.current.objectUrl).toBeNull();
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    urls.restore();
  });

  it('keeps one shared URL alive until the last consumer releases it', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const urls = installUrlStubs();
    installImageDecode();
    const read = vi.fn(async () => resourceFor());
    const first = renderHook(() =>
      useArtifactResource('session_resource_001', IMAGE_BLOCK, { read, requireImageDecode: true }),
    );
    const second = renderHook(() =>
      useArtifactResource('session_resource_001', IMAGE_BLOCK, { read, requireImageDecode: true }),
    );
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    expect(urls.createObjectURL).toHaveBeenCalledOnce();
    first.unmount();
    expect(urls.revokeObjectURL).not.toHaveBeenCalled();
    second.unmount();
    expect(urls.revokeObjectURL).toHaveBeenCalledOnce();
    urls.restore();
  });

  it('revokes resources for backgrounding, privacy cover, logout, session switch, and revocation', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const urls = installUrlStubs();
    installImageDecode();
    const eventNames = [
      'pagehide',
      'pi-remote:privacy-cover',
      'pi-remote:logout',
      'pi-remote:session-switch',
      'pi-remote:artifact-revoked',
    ];
    const read = vi.fn(async () => resourceFor());
    for (const eventName of eventNames) {
      const hook = renderHook(() =>
        useArtifactResource('session_resource_001', IMAGE_BLOCK, {
          read,
          requireImageDecode: true,
        }),
      );
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      window.dispatchEvent(new Event(eventName));
      expect(urls.revokeObjectURL).toHaveBeenCalledTimes(eventNames.indexOf(eventName) + 1);
      hook.unmount();
    }
    urls.restore();
  });

  it('does not leak URLs through a Strict-Mode mount and cleanup cycle', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const urls = installUrlStubs();
    installImageDecode();
    const read = vi.fn(async () => resourceFor());
    const Wrapper = ({ children }: { readonly children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const hook = renderHook(
      () =>
        useArtifactResource('session_resource_001', IMAGE_BLOCK, {
          read,
          requireImageDecode: true,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    hook.unmount();
    expect(urls.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
    urls.restore();
  });
});
