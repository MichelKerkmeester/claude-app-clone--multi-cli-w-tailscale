import { describe, expect, it, vi } from 'vitest';

import {
  createInboundMediaHostAdapter,
  publishApprovedImage,
  type ApprovedImageOutput,
} from '../src/index.js';

const HANDLE = 'opaque_capture_handle_000000000001';

describe('inbound media publisher boundary', () => {
  it('forwards only approved in-memory bytes or an opaque capture handle', async () => {
    const publish = vi.fn().mockResolvedValue({ status: 'accepted' });
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    await publishApprovedImage(
      { source: 'extension', mediaClass: 'screenshot', capabilityHandle: HANDLE, bytes },
      { publish },
    );
    expect(publish).toHaveBeenCalledWith({
      source: 'extension',
      mediaClass: 'screenshot',
      capabilityHandle: HANDLE,
      bytes,
    });

    await publishApprovedImage(
      { source: 'tool_result', mediaClass: 'raster', capabilityHandle: HANDLE },
      { publish },
    );
    expect(publish).toHaveBeenCalledWith({
      source: 'tool_result',
      mediaClass: 'raster',
      capabilityHandle: HANDLE,
    });
  });

  it('rejects paths, markdown, arbitrary source tools, and oversized bytes before transport', async () => {
    const publish = vi.fn();
    const invalid: unknown[] = [
      { source: 'extension', mediaClass: 'raster', capabilityHandle: HANDLE, path: '/repo/image.png' },
      { source: 'extension', mediaClass: 'raster', capabilityHandle: HANDLE, markdown: '![x](image.png)' },
      { source: 'shell', mediaClass: 'raster', capabilityHandle: HANDLE },
      { source: 'extension', mediaClass: 'raster', capabilityHandle: HANDLE, bytes: new Uint8Array(15 * 1024 * 1024 + 1) },
    ];
    for (const output of invalid) {
      await expect(publishApprovedImage(output, { publish })).rejects.toThrow();
    }
    expect(publish).not.toHaveBeenCalled();
  });

  it('keeps capability and callback disabled when the pre-stdout seam is unavailable', () => {
    const onApprovedImage = vi.fn();
    const adapter = createInboundMediaHostAdapter({
      interception: { available: false, subscribe: vi.fn() },
      onApprovedImage,
    });
    adapter.start();
    adapter.stop();
    expect(adapter.capability).toBeUndefined();
    expect(onApprovedImage).not.toHaveBeenCalled();
  });

  it('retains the strict approved output shape', () => {
    const output: ApprovedImageOutput = {
      source: 'assistant_output',
      mediaClass: 'generated',
      capabilityHandle: HANDLE,
    };
    expect(output.capabilityHandle).toBe(HANDLE);
  });
});
