// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT SHARE BINARY TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canShareDisplayedArtifact,
  shareDisplayedArtifact,
} from '../src/pages/chat/artifacts/artifact-share.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('binary artifact share boundary', () => {
  it('requires canShare({ files }) and shares no URL or host handoff', async () => {
    const bytes = new Uint8Array([4, 5, 6]);
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn((data: ShareData) => {
      expect(data.files?.[0]).toBeInstanceOf(File);
      expect(data).not.toHaveProperty('url');
      return true;
    });
    vi.stubGlobal('navigator', { share, canShare });
    const input = {
      displayName: 'safe.pdf',
      renderer: 'pdf' as const,
      displayedBuffer: '',
      displayedBytes: bytes,
      mimeType: 'application/pdf',
      shareAllowed: true,
      redaction: 'applied' as const,
      completeness: 'complete' as const,
    };
    expect(canShareDisplayedArtifact(input)).toBe(true);
    expect(await shareDisplayedArtifact(input, () => true)).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const file = share.mock.calls[0]?.[0].files?.[0];
    if (file === undefined) throw new Error('Share did not receive a binary file.');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
  });

  it('returns cancellation without calling native share', async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal('navigator', { share, canShare });
    expect(
      await shareDisplayedArtifact(
        {
          displayName: 'safe.png',
          renderer: 'image',
          displayedBuffer: '',
          displayedBytes: new Uint8Array([1]),
          mimeType: 'image/png',
          shareAllowed: true,
          redaction: 'applied',
          completeness: 'complete',
        },
        () => false,
      ),
    ).toBe('cancelled');
    expect(canShare).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });
});
