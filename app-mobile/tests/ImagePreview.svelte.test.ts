import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import ImagePreview, {
  IMAGE_PREVIEW_MAX_BYTES,
  IMAGE_PREVIEW_MAX_ZOOM,
} from '../src/pages/chat/artifacts/ImagePreview.svelte';

function block(overrides: Partial<FilePreviewBlock> = {}): FilePreviewBlock {
  return {
    id: 'image-preview-block',
    revision: 'rev_image_preview',
    seq: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    kind: 'file_preview',
    artifactId: 'artifact_image_preview',
    displayName: 'sanitized.png',
    renderer: 'image',
    mimeType: 'image/png',
    byteLength: 2,
    digest: 'a'.repeat(64),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: true,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
    ...overrides,
  };
}

class FakeImage {
  naturalWidth = 2;
  naturalHeight = 2;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(value: string) {
    if (value.length > 0) queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ImagePreview', () => {
  it('renders bounded zoom controls and revokes the displayed blob URL on unmount', async () => {
    const createObjectURL = vi.fn(() => 'blob:image-preview');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.stubGlobal('Image', FakeImage);

    const { unmount } = render(
      ImagePreview,
      { props: { block: block(), bytes: new Uint8Array([1, 2]) } },
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Sanitized image preview')).toHaveAttribute(
        'data-image-state',
        'ready',
      ),
    );
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    await fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(IMAGE_PREVIEW_MAX_ZOOM).toBe(4);
    unmount();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-preview');
  });

  it('maps a byte-bound failure to too-large without decoding the payload', async () => {
    const onStateChange = vi.fn();
    render(
      ImagePreview,
      {
        props: {
          block: block({ byteLength: IMAGE_PREVIEW_MAX_BYTES + 1 }),
          bytes: new Uint8Array([1, 2]),
          onStateChange,
        },
      },
    );
    await waitFor(() => expect(onStateChange).toHaveBeenCalledWith('too-large'));
    expect(screen.getByLabelText('Sanitized image preview')).toHaveAttribute(
      'data-image-state',
      'too-large',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
