// ───────────────────────────────────────────────────────────────────
// MODULE: IMAGE PREVIEW DIMENSIONS TEST
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import ImagePreview from '../src/pages/chat/artifacts/image-preview.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

class NaturalSizeImage {
  naturalWidth = 640;
  naturalHeight = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(value: string) {
    if (value.length > 0) queueMicrotask(() => this.onload?.());
  }
}

const imageBlock = {
  digest: 'image-digest',
  byteLength: 1,
  mimeType: 'image/png',
  altText: 'Known-size image',
} as FilePreviewBlock;

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('Image', NaturalSizeImage);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:image-preview'),
    revokeObjectURL: vi.fn(),
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('image preview dimensions', () => {
  it('shows intrinsic dimensions for a loaded image', async () => {
    render(ImagePreview, { block: imageBlock, bytes: new Uint8Array([1]) });

    expect(await screen.findByText('640 × 480px')).toBeInTheDocument();
    expect(document.querySelector('.image-preview--stage')).not.toBeNull();
  });
});
