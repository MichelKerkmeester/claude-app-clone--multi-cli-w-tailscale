// Port of app-mobile/tests/disclosure-persistence.test.tsx (React behavior oracle)
// to @testing-library/svelte. The React *.test.tsx oracle is NEVER modified. Only
// the import lines, the two mocked modules, and the render call shape are adapted;
// every assertion mirrors the React oracle.
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resource = vi.hoisted(() => ({
  useArtifactResource: vi.fn(),
}));

// The Svelte useArtifactResource is a runes factory returning `{ current }`,
// whereas the React hook returned the snapshot directly, so the Svelte
// factory mock wraps the ready snapshot in `{ current }`.
vi.mock('@tanstack/svelte-virtual', () => {
  const store = (value: unknown) => ({ subscribe: (run: (v: unknown) => void) => { run(value); return () => {}; } });
  return {
    createVirtualizer: (opts: { count?: number }) => {
      let count = opts?.count ?? 0;
      const api = {
        getTotalSize: () => count * 180,
        getVirtualItems: () => Array.from({ length: count }, (_unused, index) => ({ index, start: index * 180, key: index })),
        measureElement: () => undefined,
        setOptions: (next: { count?: number }) => { if (typeof next?.count === 'number') count = next.count; },
      };
      return store(api);
    },
  };
});
vi.mock('../src/lib/artifacts/useArtifactResource.svelte.js', () => resource);

import TranscriptList from '../src/lib/transcript/TranscriptList.svelte';
import type { DisplayTranscriptBlock } from '../src/state.js';

const IMAGE: InboundImageReadyBlock = {
  id: 'block_disclosure_image_001',
  revision: 2,
  seq: 4,
  occurredAt: '2026-08-17T10:00:02.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_disclosure_private_001',
    revision: 'revision_disclosure_private_001',
    expiresAt: '2099-01-01T00:00:00.000Z',
    full: {
      digest: 'digest_disclosure_private_001',
      mediaType: 'image/png',
      width: 320,
      height: 200,
      byteLength: 68,
    },
    thumbnail: {
      digest: 'digest_disclosure_private_001',
      mediaType: 'image/png',
      width: 160,
      height: 100,
      byteLength: 68,
    },
  },
  presentation: { safeAlt: '' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

const BLOCKS: readonly DisplayTranscriptBlock[] = [
  {
    id: 'block_disclosure_user_001',
    revision: 1,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'text',
    role: 'user',
    text: 'Capture the screen.',
  },
  {
    id: 'block_disclosure_call_001',
    revision: 1,
    seq: 2,
    occurredAt: '2026-08-17T10:00:01.000Z',
    kind: 'tool_call',
    toolName: 'screenshot',
    inputSummary: 'capture current screen',
  },
  {
    id: 'block_disclosure_result_001',
    revision: 1,
    seq: 3,
    occurredAt: '2026-08-17T10:00:02.000Z',
    kind: 'tool_result',
    toolName: 'screenshot',
    output: 'captured',
    isError: false,
  },
  IMAGE,
];

beforeEach(() => {
  resource.useArtifactResource.mockReturnValue({
    current: {
      status: 'ready',
      objectUrl: 'blob:disclosure-image',
      reload: vi.fn(),
      close: vi.fn(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('transcript disclosure persistence', () => {
  it('keeps the tool-origin image visible and operable after the disclosure collapses', async () => {
    const user = userEvent.setup();
    render(TranscriptList, {
      props: { sessionId: 'session_disclosure_001', blocks: BLOCKS, running: false },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Open screenshot preview/i })).toBeEnabled(),
    );
    const cardButton = screen.getByRole('button', { name: /Open screenshot preview/i });
    const disclosure = document.querySelector('.activity-group');
    const trigger = disclosure?.querySelector('.evidence-trigger');
    expect(trigger).not.toBeNull();

    await user.click(trigger as HTMLElement);
    await user.click(trigger as HTMLElement);

    expect(cardButton).toBeVisible();
    expect(cardButton).toBeEnabled();
    expect(disclosure?.contains(cardButton)).toBe(false);
  });
});