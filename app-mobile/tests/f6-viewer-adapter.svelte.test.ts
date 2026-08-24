// ───────────────────────────────────────────────────────────────────
// MODULE: F6 VIEWER ADAPTER TESTS
// ───────────────────────────────────────────────────────────────────

// Port of app-mobile/tests/F6ViewerAdapter.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React ApiCapture/useArtifactViewer
// helper is replaced by F6ViewerHarness.svelte (provider + Typed-transcript
// section + ArtifactViewerApiCapture), which hands the live viewer API to the
// test via onReady. The React act(() => api.openInMemory(...)) calls become
// direct api method invocations followed by findBy*/waitFor because the Svelte
// runes state machine flushes on microtask/setTimeout(0), matching the React
// act() flush semantics. The normalizeTranscriptBlocks import path is unchanged
// (../src/rich-content/normalizeTranscriptBlocks.js); createInMemoryArtifactDocument
// moved to ../src/lib/rich-content/F6ViewerAdapter.js (its real Svelte location).

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArtifactViewerContextValue } from '../src/pages/chat/artifacts/types.js';
import { createInMemoryArtifactDocument } from '../src/pages/chat/rich-content/f6-viewer-adapter.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
} from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';

import F6ViewerHarness from './support/F6ViewerHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

// The in-memory code document renders through CodePreview with highlighting
// enabled. Under jsdom `Worker` is undefined, and the Svelte highlight port's
// $effect reads `state` inside its `typeof Worker === 'undefined'` branch while
// also writing `state`, which loops (effect_update_depth_exceeded). Stubbing
// Worker (as CodePreview.svelte.test.ts does) routes the effect through the
// `new Worker()` path so it never reads state synchronously; the no-op worker
// never responds, so tokens stay null and CodePreview renders the raw source
// text — exactly what the oracle's getByText assertions read. Highlighting is
// not asserted by the oracle, so this stub is a pure jsdom workaround.
class NoopWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public postMessage(): void {}
  public terminate(): void {}
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('Worker', NoopWorker);
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('F6ViewerAdapter', () => {
  it('opens one shared in-memory viewer, records only the opaque block id, and never fetches', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    let api: ArtifactViewerContextValue | null = null;
    render(F6ViewerHarness, {
      props: {
        onReady: (value: ArtifactViewerContextValue) => {
          api = value;
        },
      },
    });
    if (api === null) throw new Error('Viewer API was not captured.');
    const block = codeBlock();
    const memoryDocument = createInMemoryArtifactDocument(block);
    api.openInMemory(memoryDocument, null);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('const exact = "redacted";')).toBeInTheDocument();
    expect(globalThis.document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(window.history.state).toMatchObject({
      __piRemoteArtifactBlockId: block.blockId,
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    const historyState = window.history.state;
    api.openInMemory(
      {
        ...memoryDocument,
        revision: 2,
        text: 'const updated = "still redacted";',
      },
      null,
    );
    await tick();
    expect(globalThis.document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(window.history.state).toEqual(historyState);
    expect(await screen.findByText('const updated = "still redacted";')).toBeInTheDocument();

    api.updateInMemory({
      ...memoryDocument,
      revision: 3,
      text: '',
      sourceState: 'source-removed',
    });
    await tick();
    expect(screen.getByText('const updated = "still redacted";')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/source was removed/u);

    api.close('close');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
