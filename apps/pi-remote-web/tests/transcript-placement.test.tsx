import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resource = vi.hoisted(() => ({
  useArtifactResource: vi.fn(),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { readonly count: number }) => ({
    getTotalSize: () => count * 180,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 180 })),
    measureElement: () => undefined,
  }),
}));
vi.mock('../src/artifacts/useArtifactResource.js', () => resource);

import { TranscriptList } from '../src/App.js';
import type { DisplayTranscriptBlock } from '../src/state.js';

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
    status: 'ready',
    objectUrl: 'blob:placement-image',
    reload: vi.fn(),
    close: vi.fn(),
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
    const { container } = render(
      <TranscriptList
        sessionId="session_placement_001"
        blocks={transcriptBlocks()}
        running={false}
      />,
    );

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
