// ───────────────────────────────────────────────────────────────────
// MODULE: Media Preview Tests
// ───────────────────────────────────────────────────────────────────
// Media bytes are supplied explicitly by the caller; the preview owns only
// its temporary playback URL and releases it with the component lifecycle.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UnsupportedPreview from '../src/pages/chat/artifacts/unsupported-preview.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const MEDIA_BYTES = new Uint8Array([1, 2, 3]);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function mockObjectUrls() {
  const createObjectURL = vi.fn(() => 'blob:media-preview');
  const revokeObjectURL = vi.fn();
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return {
    createObjectURL,
    revokeObjectURL,
    restore: () => {
      if (createDescriptor === undefined) delete (URL as { createObjectURL?: unknown }).createObjectURL;
      else Object.defineProperty(URL, 'createObjectURL', createDescriptor);
      if (revokeDescriptor === undefined) delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
      else Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('UnsupportedPreview media path', () => {
  it('renders a supported audio type in a player and revokes its URL on teardown', async () => {
    const urls = mockObjectUrls();
    const view = render(UnsupportedPreview, {
      props: {
        renderer: 'audio',
        media: { bytes: MEDIA_BYTES, mediaType: 'audio/mpeg', label: 'Voice note' },
      },
    });

    const player = await waitFor(() => {
      const audio = document.querySelector('audio');
      expect(audio).not.toBeNull();
      return audio as HTMLAudioElement;
    });
    expect(player).toHaveAttribute('src', 'blob:media-preview');
    expect(player).toHaveAttribute('aria-label', 'Voice note');
    expect(urls.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    view.unmount();

    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:media-preview');
    urls.restore();
  });

  it('keeps an unsupported media type on the unavailable notice path', () => {
    const urls = mockObjectUrls();
    const { container } = render(UnsupportedPreview, {
      props: {
        renderer: 'binary',
        media: { bytes: MEDIA_BYTES, mediaType: 'application/octet-stream' },
      },
    });

    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    expect(container.querySelector('audio, video')).toBeNull();
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    urls.restore();
  });
});
