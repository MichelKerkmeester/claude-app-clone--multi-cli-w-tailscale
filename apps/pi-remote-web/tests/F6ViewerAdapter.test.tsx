import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useArtifactViewer,
  ArtifactViewerProvider,
  type ArtifactViewerContextValue,
} from '../src/artifacts/ArtifactViewerProvider.js';
import { createInMemoryArtifactDocument } from '../src/rich-content/F6ViewerAdapter.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
} from '../src/rich-content/normalizeTranscriptBlocks.js';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

function ApiCapture({ onReady }: { readonly onReady: (api: ArtifactViewerContextValue) => void }) {
  const api = useArtifactViewer();
  onReady(api);
  return null;
}

function codeBlock(): NormalizedCodeBlock {
  const [block] = normalizeTranscriptBlocks({
    sessionId: 'session-f6-001',
    blocks: [
      {
        id: 'f6-code-001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind: 'text',
        role: 'assistant',
        text: '```typescript\nconst exact = "redacted";\n```',
      },
    ],
  }).filter((candidate): candidate is NormalizedCodeBlock => candidate.kind === 'code');
  if (block === undefined) throw new Error('Expected code block.');
  return block;
}

describe('F6ViewerAdapter', () => {
  it('opens one shared in-memory viewer, records only the opaque block id, and never fetches', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    let api: ArtifactViewerContextValue | null = null;
    render(
      <ArtifactViewerProvider>
        <section aria-label="Typed transcript" tabIndex={-1}>
          <button type="button">Trigger</button>
        </section>
        <ApiCapture onReady={(value) => (api = value)} />
      </ArtifactViewerProvider>,
    );
    if (api === null) throw new Error('Viewer API was not captured.');
    const block = codeBlock();
    const memoryDocument = createInMemoryArtifactDocument(block);
    act(() => api?.openInMemory(memoryDocument, null));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('const exact = "redacted";')).toBeInTheDocument();
    expect(globalThis.document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(window.history.state).toMatchObject({
      __piRemoteArtifactBlockId: block.blockId,
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    const historyState = window.history.state;
    act(() =>
      api?.openInMemory(
        {
          ...memoryDocument,
          revision: 2,
          text: 'const updated = "still redacted";',
        },
        null,
      ),
    );
    expect(globalThis.document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(window.history.state).toEqual(historyState);
    expect(screen.getByText('const updated = "still redacted";')).toBeInTheDocument();

    act(() =>
      api?.updateInMemory({
        ...memoryDocument,
        revision: 3,
        text: '',
        sourceState: 'source-removed',
      }),
    );
    expect(screen.getByText('const updated = "still redacted";')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/source was removed/u);

    act(() => api?.close('close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
