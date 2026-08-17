import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ArtifactViewerProvider,
  useArtifactViewer,
} from '../src/artifacts/ArtifactViewerProvider.js';
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

const FIRST: InboundImageReadyBlock = {
  id: 'block_history_first',
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
    id: 'artifact_history_first',
    revision: 'rev_history_first',
    expiresAt: '2026-08-17T11:00:00.000Z',
    full: {
      digest: 'a'.repeat(64),
      mediaType: 'image/png',
      width: 640,
      height: 360,
      byteLength: 12,
    },
    thumbnail: {
      digest: 'b'.repeat(64),
      mediaType: 'image/png',
      width: 320,
      height: 180,
      byteLength: 6,
    },
  },
  presentation: { safeAlt: 'First screenshot' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

const SECOND: InboundImageReadyBlock = {
  ...FIRST,
  id: 'block_history_second',
  displayName: 'Image from pi',
  artifact: { ...FIRST.artifact, id: 'artifact_history_second', revision: 'rev_history_second' },
};

function OpenButtons() {
  const viewer = useArtifactViewer();
  return (
    <>
      <button
        type="button"
        onClick={(event) => viewer.openInboundImage(FIRST, event.currentTarget, null)}
      >
        Open first
      </button>
      <button
        type="button"
        onClick={(event) => viewer.openInboundImage(SECOND, event.currentTarget, null)}
      >
        Open second
      </button>
    </>
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('viewer history and focus ownership', () => {
  it('uses one history child, restores transcript scroll, and returns focus to the trigger', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(
      <ArtifactViewerProvider>
        <div className="transcript-scroll">
          <div aria-label="Typed transcript" tabIndex={-1}>
            <OpenButtons />
          </div>
        </div>
      </ArtifactViewerProvider>,
    );
    const scroll = document.querySelector<HTMLElement>('.transcript-scroll');
    expect(scroll).not.toBeNull();
    if (scroll === null) return;
    scroll.scrollTop = 120;
    scroll.scrollLeft = 18;
    const before = window.history.length;

    const first = screen.getByRole('button', { name: 'Open first' });
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Screenshot' })).toBeVisible());
    expect(window.history.length).toBe(before + 1);
    expect(JSON.stringify(window.history.state)).not.toContain(FIRST.id);

    fireEvent.click(screen.getByRole('button', { name: 'Open second', hidden: true }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Image from pi' })).toBeVisible(),
    );
    expect(window.history.length).toBe(before + 1);
    expect(JSON.stringify(window.history.state)).not.toContain(SECOND.id);

    fireEvent.click(screen.getByRole('button', { name: /Close image from pi viewer/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(historyBack).toHaveBeenCalledOnce();
    expect(scroll.scrollTop).toBe(120);
    expect(scroll.scrollLeft).toBe(18);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open second' }));
  });
});
