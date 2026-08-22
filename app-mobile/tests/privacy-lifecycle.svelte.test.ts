// Port of app-mobile/tests/privacy-lifecycle.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React OpenDiff + <ArtifactViewerProvider>
// wrapper is replaced by PrivacyDiffHarness.svelte (provider + 'Open privacy diff'
// trigger child), and the React renderHook(useArtifactResource) probe is replaced by
// ArtifactResourceProbe.svelte with onSnapshot handing the live snapshot (real
// objectUrl/status) to the test — the Svelte equivalent of hook.result.current.
// Privacy-curtain lifecycle and object-URL revocation are async under Svelte
// (phase transitions on setTimeout(0), state flush on microtask), so assertions
// are awaited with waitFor / findBy* before reading sync state.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactResource } from '../src/relay.js';
import type { ArtifactResourceSnapshot } from '../src/lib/artifacts/useArtifactResource.svelte.js';
import { clearArtifactResourceStore } from '../src/lib/artifacts/useArtifactResource.svelte.js';

import PrivacyDiffHarness from './support/PrivacyDiffHarness.svelte';
import ArtifactResourceProbe from './support/ArtifactResourceProbe.svelte';

const IMAGE_BYTES = new TextEncoder().encode('privacy image bytes');
const IMAGE_DIGEST = sha256('privacy image bytes');
const IMAGE: FilePreviewBlock = {
  id: 'block_phase_privacy_image',
  revision: 'revision_phase_privacy_image',
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_phase_privacy_image',
  displayName: 'Privacy image',
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

let restoreUrlStubs: (() => void) | null = null;

function installResourceStubs() {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: vi.fn() })));
  const createObjectURL = vi.fn(() => 'blob:privacy');
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
  return { createObjectURL, revokeObjectURL };
}

afterEach(() => {
  cleanup();
  clearArtifactResourceStore();
  restoreUrlStubs?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('data-artifact-viewer-privacy');
  document.getElementById('artifact-viewer-privacy-curtain')?.remove();
});

describe('privacy lifecycle', () => {
  it('covers before React closes the viewer for every privacy invalidation event', async () => {
    const events = [
      'pi-remote:privacy-cover',
      'privacy-cover',
      'pi-remote:logout',
      'logout',
      'pi-remote:session-switch',
      'session-switch',
      'pi-remote:artifact-revoked',
      'artifact-revoked',
      'pi-remote:transcript-superseded',
      'transcript-superseded',
    ];
    render(PrivacyDiffHarness);
    const trigger = screen.getByRole('button', { name: 'Open privacy diff' });
    for (const eventName of events) {
      await fireEvent.click(trigger);
      await screen.findByRole('dialog');
      window.dispatchEvent(new Event(eventName));
      expect(document.documentElement.dataset.artifactViewerPrivacy).toBe('covered');
      expect(document.getElementById('artifact-viewer-privacy-curtain')).not.toBeNull();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('purges on visibility hidden and leaves no retained curtain after closing', async () => {
    render(PrivacyDiffHarness);
    await fireEvent.click(screen.getByRole('button', { name: 'Open privacy diff' }));
    await screen.findByRole('dialog');
    const descriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(document.getElementById('artifact-viewer-privacy-curtain')).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    if (descriptor === undefined) delete (document as { visibilityState?: unknown }).visibilityState;
    else Object.defineProperty(document, 'visibilityState', descriptor);
    expect(document.getElementById('artifact-viewer-privacy-curtain')).toBeNull();
  });

  it('revokes active object URLs when transcript supersession arrives', async () => {
    const urls = installResourceStubs();
    const read = vi.fn(async (): Promise<ArtifactResource> => ({
      bytes: IMAGE_BYTES.slice(),
      contentType: IMAGE.mimeType,
      revision: IMAGE.revision,
      etag: `"${IMAGE.digest}"`,
      digest: IMAGE.digest,
    }));
    let snapshot: ArtifactResourceSnapshot | null = null;
    render(ArtifactResourceProbe, {
      props: {
        sessionId: 'session_phase_privacy',
        block: IMAGE,
        read,
        requireImageDecode: true,
        onSnapshot: (value: ArtifactResourceSnapshot) => {
          snapshot = value;
        },
      },
    });
    await waitFor(() => expect(snapshot?.status).toBe('ready'));
    window.dispatchEvent(new Event('transcript-superseded'));
    await waitFor(() => expect(snapshot?.status).toBe('closed'));
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:privacy');
    expect(snapshot?.objectUrl).toBeNull();
  });
});
