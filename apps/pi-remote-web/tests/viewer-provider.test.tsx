import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  useArtifactViewer,
  ArtifactViewerProvider,
} from '../src/artifacts/ArtifactViewerProvider.js';
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import './artifact-resource.test.js';
import './artifact-cache.test.js';

const INBOUND_IMAGE: InboundImageReadyBlock = {
  id: 'block_inbound_viewer_001',
  revision: 7,
  seq: 8,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_inbound_viewer_001',
    revision: 'rev_inbound_viewer_001',
    expiresAt: '2026-08-17T11:00:00.000Z',
    full: {
      digest: 'a'.repeat(64),
      mediaType: 'image/png',
      width: 1280,
      height: 720,
      byteLength: 2048,
    },
    thumbnail: {
      digest: 'b'.repeat(64),
      mediaType: 'image/png',
      width: 320,
      height: 180,
      byteLength: 512,
    },
  },
  presentation: { safeAlt: 'A redacted screenshot' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

function OpenInboundImage() {
  const viewer = useArtifactViewer();
  return (
    <button
      type="button"
      onClick={(event) => viewer.openInboundImage(INBOUND_IMAGE, event.currentTarget, null)}
    >
      Open screenshot
    </button>
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('shared inbound image viewer', () => {
  it('shows safe metadata only and exposes no export, share, save, copy, or download action', async () => {
    render(
      <ArtifactViewerProvider>
        <OpenInboundImage />
      </ArtifactViewerProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open screenshot' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Screenshot' })).toBeVisible());
    expect(JSON.stringify(window.history.state)).not.toContain(INBOUND_IMAGE.artifact.id);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Pan image' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull();
    expect(screen.queryByText(INBOUND_IMAGE.artifact.id)).toBeNull();
    expect(screen.queryByText(INBOUND_IMAGE.artifact.full.digest)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Dimensions')).toBeVisible();
    expect(screen.getByText('1280 × 720')).toBeVisible();
    expect(screen.getByText('Applied')).toBeVisible();
  });
});
