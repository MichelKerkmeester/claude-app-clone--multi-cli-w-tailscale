// ───────────────────────────────────────────────────────────────────
// MODULE: TRANSCRIPT PINCH SCALE TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import TranscriptList from '../src/pages/chat/transcript/transcript-list.svelte';
import type { DisplayTranscriptBlock } from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SCALE_PROPERTY = '--transcript-text-scale';

function transcriptBlock(): DisplayTranscriptBlock {
  return {
    id: 'pinch_scale_transcript_block',
    revision: 1,
    seq: 1,
    occurredAt: '2026-08-28T05:00:00.000Z',
    kind: 'text',
    role: 'assistant',
    text: 'A transcript row remains readable while the reader pinches.',
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('TranscriptList pinch scaling', () => {
  it('attaches the transient pinch action to the virtualized scroll host', () => {
    const { container } = render(TranscriptList, {
      props: {
        sessionId: 'session_pinch_scale',
        blocks: [transcriptBlock()],
        running: false,
      },
    });
    const host = container.querySelector('.transcript--scroll');
    expect(host).not.toBeNull();
    const scrollHost = host as HTMLElement;

    fireEvent.pointerDown(scrollHost, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(scrollHost, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 100,
      clientY: 0,
    });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 150,
      clientY: 0,
    });

    expect(scrollHost.style.getPropertyValue(SCALE_PROPERTY)).toBe('1.5');

    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(window, { pointerId: 2, pointerType: 'touch' });
    expect(scrollHost.style.getPropertyValue(SCALE_PROPERTY)).toBe('1.5');
  });
});
