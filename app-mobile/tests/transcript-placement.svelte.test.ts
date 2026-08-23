// Port of app-mobile/tests/transcript-placement.test.tsx (React behavior oracle)
// to @testing-library/svelte. The React *.test.tsx oracle is NEVER modified. Only
// the import lines, the two mocked modules, and the render call shape are adapted;
// every assertion mirrors the React oracle.
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, waitFor } from '@testing-library/svelte';
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
vi.mock('../src/pages/chat/artifacts/use-artifact-resource.svelte.js', () => resource);

import TranscriptList from '../src/pages/chat/transcript/TranscriptList.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

function readyBlock(
  id: string,
  seq: number,
  source: 'tool_result' | 'assistant_output',
): InboundImageReadyBlock {
  return {
    id,
    revision: 2,
    seq,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'inbound_image',
    schemaVersion: 1,
    mediaClass: 'screenshot',
    displayName: source === 'tool_result' ? 'Screenshot' : 'Image from pi',
    source,
    availability: 'ready',
    artifact: {
      id: `artifact_${id}`,
      revision: `revision_${id}`,
      expiresAt: '2099-01-01T00:00:00.000Z',
      full: {
        digest: `digest_${id}`,
        mediaType: 'image/png',
        width: 320,
        height: 200,
        byteLength: 68,
      },
      thumbnail: {
        digest: `digest_${id}`,
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
}

function transcriptBlocks(): readonly DisplayTranscriptBlock[] {
  return [
    {
      id: 'block_user_001',
      revision: 1,
      seq: 1,
      occurredAt: '2026-08-17T10:00:00.000Z',
      kind: 'text',
      role: 'user',
      text: 'Inspect the current screen.',
    },
    {
      id: 'block_tool_call_001',
      revision: 1,
      seq: 2,
      occurredAt: '2026-08-17T10:00:01.000Z',
      kind: 'tool_call',
      toolName: 'screenshot',
      inputSummary: 'capture current screen',
    },
    {
      id: 'block_tool_result_001',
      revision: 1,
      seq: 3,
      occurredAt: '2026-08-17T10:00:02.000Z',
      kind: 'tool_result',
      toolName: 'screenshot',
      output: 'captured',
      isError: false,
    },
    readyBlock('block_tool_image_001', 4, 'tool_result'),
    readyBlock('block_tool_image_002', 5, 'tool_result'),
    {
      id: 'block_assistant_001',
      revision: 1,
      seq: 6,
      occurredAt: '2026-08-17T10:00:03.000Z',
      kind: 'text',
      role: 'assistant',
      text: 'The screen is ready for review.',
    },
    readyBlock('block_assistant_image_001', 7, 'assistant_output'),
    readyBlock('block_assistant_image_002', 8, 'assistant_output'),
  ];
}

beforeEach(() => {
  resource.useArtifactResource.mockReturnValue({
    current: {
      status: 'ready',
      objectUrl: 'blob:placement-image',
      reload: vi.fn(),
      close: vi.fn(),
    },
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('transcript inline image placement', () => {
  it('keeps tool images outside the disclosure, preserves assistant order, stacks two images, and adds actions once', async () => {
    const { container } = render(TranscriptList, {
      props: { sessionId: 'session_placement_001', blocks: transcriptBlocks(), running: false },
    });

    await waitFor(() =>
      expect(container.querySelectorAll('[data-inbound-image-card="true"]')).toHaveLength(4),
    );
    const activity = container.querySelector('.activity-group');
    const cards = [...container.querySelectorAll('[data-inbound-image-card="true"]')];
    const toolImage = cards[0] ?? null;
    const assistantImage = cards[2] ?? null;
    expect(activity).not.toBeNull();
    expect(toolImage).not.toBeNull();
    expect(assistantImage).not.toBeNull();
    expect(activity?.contains(toolImage)).toBe(false);

    const stack = toolImage?.parentElement?.parentElement;
    expect(stack).toHaveClass('inbound-image-stack');
    expect(stack?.querySelectorAll('[data-inbound-image-card="true"]')).toHaveLength(2);
    expect(container.querySelectorAll('.inbound-image-stack')).toHaveLength(2);
    expect(container.querySelectorAll('.turn-actions')).toHaveLength(1);
    const actions = container.querySelector('.turn-actions');
    expect(actions).not.toBeNull();
    expect(
      assistantImage?.compareDocumentPosition(actions as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      toolImage?.compareDocumentPosition(activity as Node) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
});