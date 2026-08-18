// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Inbound Media Boundary Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';

import { createInboundMediaHostAdapter, type ApprovedImageOutput } from '../src/index.js';

describe('inbound media host boundary', () => {
  it('advertises no capability and forwards nothing when interception is unavailable', () => {
    const stdout = { write: vi.fn() };
    const session = { write: vi.fn() };
    const subscribe = vi.fn();
    const onApprovedImage = vi.fn();
    const adapter = createInboundMediaHostAdapter({
      interception: { available: false, subscribe },
      onApprovedImage,
      stdout,
      session,
    });

    adapter.start();
    adapter.stop();

    expect(adapter.capability).toBeUndefined();
    expect(adapter.interceptionAvailable).toBe(false);
    expect(subscribe).not.toHaveBeenCalled();
    expect(onApprovedImage).not.toHaveBeenCalled();
    expect(stdout.write).not.toHaveBeenCalled();
    expect(session.write).not.toHaveBeenCalled();
  });

  it('keeps the capability off when the runtime snapshot is absent or disabled', () => {
    const subscribe = vi.fn();
    const onApprovedImage = vi.fn();
    const adapter = createInboundMediaHostAdapter({
      interception: { available: true, subscribe },
      onApprovedImage,
    });

    adapter.start();

    expect(adapter.capability).toBeUndefined();
    expect(adapter.interceptionAvailable).toBe(true);
    expect(subscribe).not.toHaveBeenCalled();
    expect(onApprovedImage).not.toHaveBeenCalled();

    const disabled = createInboundMediaHostAdapter({
      interception: { available: true, subscribe },
      runtimeSnapshot: { media: { enabled: false, imageIn: true } },
      onApprovedImage,
    });
    disabled.start();

    expect(disabled.capability).toBeUndefined();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('forwards only the opaque seam handle after the runtime snapshot enables image input', () => {
    let published: ((output: unknown) => void) | undefined;
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((handler: (output: unknown) => void) => {
      published = handler;
      return unsubscribe;
    });
    const onApprovedImage = vi.fn();
    const stdout = { write: vi.fn() };
    const session = { write: vi.fn() };
    const adapter = createInboundMediaHostAdapter({
      interception: { available: true, subscribe },
      runtimeSnapshot: { media: { enabled: true, imageIn: true } },
      onApprovedImage,
      stdout,
      session,
    });
    const output: ApprovedImageOutput = {
      source: 'tool_result',
      mediaClass: 'raster',
      capabilityHandle: 'opaque_handle_000000000001',
    };

    adapter.start();
    published?.(output);
    adapter.stop();

    expect(adapter.capability).toEqual({ enabled: true, imageIn: true });
    expect(adapter.interceptionAvailable).toBe(true);
    expect(onApprovedImage).toHaveBeenCalledWith(output);
    expect(stdout.write).not.toHaveBeenCalled();
    expect(session.write).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
