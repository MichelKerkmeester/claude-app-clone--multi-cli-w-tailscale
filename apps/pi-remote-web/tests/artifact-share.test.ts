import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canCopyDisplayedArtifact,
  canShareDisplayedArtifact,
  copyDisplayedArtifact,
  shareDisplayedArtifact,
} from '../src/artifacts/artifact-share.js';

const BASE_INPUT = {
  displayName: 'safe.txt',
  renderer: 'text' as const,
  displayedBuffer: 'DISPLAYED_SAFE_BUFFER',
  shareAllowed: true,
  redaction: 'not-needed' as const,
  completeness: 'complete' as const,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('controlled artifact sharing', () => {
  it('requires both policy and a native sharing capability', () => {
    vi.stubGlobal('navigator', {});
    expect(canShareDisplayedArtifact(BASE_INPUT)).toBe(false);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: vi.fn(() => true) });
    expect(canShareDisplayedArtifact({ ...BASE_INPUT, shareAllowed: false })).toBe(false);
    expect(canShareDisplayedArtifact(BASE_INPUT)).toBe(true);
  });

  it('shares only the displayed sanitized buffer and never mints a URL', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share, canShare: vi.fn(() => true) });
    const result = await shareDisplayedArtifact(BASE_INPUT);
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'safe.txt',
      text: 'DISPLAYED_SAFE_BUFFER',
    });
    expect(share.mock.calls[0]?.[0]).not.toHaveProperty('url');
  });

  it('treats user cancellation, including AbortError, as a no-op', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    vi.stubGlobal('navigator', { share, canShare: vi.fn(() => true) });
    expect(
      await shareDisplayedArtifact({ ...BASE_INPUT, completeness: 'excerpt' }, () => false),
    ).toBe('cancelled');
    expect(share).not.toHaveBeenCalled();
    expect(await shareDisplayedArtifact(BASE_INPUT)).toBe('cancelled');
  });

  it('confirms partial or redacted disclosure before calling native share', async () => {
    const share = vi.fn(async () => undefined);
    const confirm = vi.fn(() => true);
    vi.stubGlobal('navigator', { share, canShare: vi.fn(() => true) });
    const result = await shareDisplayedArtifact(
      { ...BASE_INPUT, redaction: 'applied', completeness: 'excerpt' },
      confirm,
    );
    expect(result).toBe('shared');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('copies the same displayed buffer without requiring share capability', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(canCopyDisplayedArtifact()).toBe(true);
    expect(await copyDisplayedArtifact(BASE_INPUT.displayedBuffer)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(BASE_INPUT.displayedBuffer);
  });
});
